// supabase/functions/cleanup-pending-orders/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log("🚀 [EDGE FUNCTION] cleanup-pending-orders started at", new Date().toISOString());
  console.log("📥 Request method:", req.method);
  console.log("📥 Request URL:", req.url);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  
  console.log("🔑 Environment check:", {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    hasStripeKey: !!stripeSecretKey,
  });
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch unpaid orders that are at least 30 minutes old (to avoid checking very recent orders)
    // This is just an optimization - we'll still verify with Stripe before deleting
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: unpaidOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, stripe_checkout_id, created_at")
      .eq("status", "unpaid")
      .lt("created_at", thirtyMinutesAgo)
      .not("stripe_checkout_id", "is", null);

    if (fetchError) {
      console.error("❌ Error fetching unpaid orders:", fetchError);
      return new Response("Failed to fetch unpaid orders", { status: 500 });
    }

    if (!unpaidOrders || unpaidOrders.length === 0) {
      console.log("✅ No unpaid orders to clean up");
      console.log("🔍 Debug: Query parameters:", {
        status: "unpaid",
        created_before: thirtyMinutesAgo,
        has_checkout_id: "not null",
      });
      
      // Let's also check how many unpaid orders exist total (for debugging)
      const { count: totalUnpaidCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "unpaid");
      
      console.log("🔍 Debug: Total unpaid orders in database:", totalUnpaidCount);
      
      return new Response("No orders to clean up", { status: 200 });
    }

    console.log(`🔍 Found ${unpaidOrders.length} unpaid order(s) to check`);
    console.log(`📋 Order details:`, JSON.stringify(unpaidOrders.map(o => ({ id: o.id, checkout_id: o.stripe_checkout_id, created: o.created_at })), null, 2));

    const ordersToDelete: string[] = [];

    // Check each order's Stripe session status
    for (const order of unpaidOrders) {
      if (!order.stripe_checkout_id) {
        // Skip orders without a checkout ID (these might be manual/invoice orders)
        console.log(`⏭️ Skipping order ${order.id} - no stripe_checkout_id`);
        continue;
      }

      try {
        console.log(`\n🔍 Checking order ${order.id} with session ${order.stripe_checkout_id}`);
        
        // Retrieve the Stripe checkout session to check its status
        const stripeResponse = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${order.stripe_checkout_id}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        console.log(`📡 Stripe API response status: ${stripeResponse.status}`);

        if (!stripeResponse.ok) {
          // If session not found (404), it means the session was deleted/expired
          // For old unpaid orders, this means the session is definitely expired, so delete the order
          if (stripeResponse.status === 404) {
            console.log(`⚠️ Stripe session ${order.stripe_checkout_id} not found (404 - deleted/expired)`);
            console.log(`   ✅ Marking order ${order.id} for deletion`);
            ordersToDelete.push(order.id);
            continue;
          }
          
          console.error(`❌ Error fetching Stripe session ${order.stripe_checkout_id}: ${stripeResponse.status}`);
          const errorText = await stripeResponse.text();
          console.error(`   Error details: ${errorText}`);
          continue;
        }

        const session = await stripeResponse.json();
        
        console.log(`📊 Stripe session data:`, JSON.stringify({
          status: session.status,
          payment_status: session.payment_status,
          expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'null',
          created: session.created ? new Date(session.created * 1000).toISOString() : 'null',
          expires_at_timestamp: session.expires_at,
          current_timestamp: Date.now(),
        }, null, 2));

        // Check if session is expired
        // A session is expired if status is 'expired' OR expires_at is in the past
        const isExpired = 
          session.status === "expired" || 
          (session.expires_at && session.expires_at * 1000 < Date.now());

        console.log(`🔍 Expiration check:`, JSON.stringify({
          status_is_expired: session.status === "expired",
          expires_at_check: session.expires_at ? `${session.expires_at * 1000} < ${Date.now()} = ${session.expires_at * 1000 < Date.now()}` : 'no expires_at',
          isExpired: isExpired,
        }, null, 2));

        if (isExpired) {
          console.log(`✅ Session ${order.stripe_checkout_id} is EXPIRED, marking order ${order.id} for deletion`);
          ordersToDelete.push(order.id);
        } else {
          console.log(`⏭️ Session ${order.stripe_checkout_id} is still ACTIVE (status: ${session.status}), keeping order ${order.id}`);
        }
      } catch (error) {
        console.error(`❌ Error checking Stripe session for order ${order.id}:`, error);
        console.error(`   Error details:`, JSON.stringify(error, null, 2));
        // On error, skip this order to be safe - don't delete if we can't verify
        continue;
      }
    }

    // Delete only the orders with expired Stripe sessions
    console.log(`\n📋 Summary: ${ordersToDelete.length} order(s) marked for deletion`);
    console.log(`   Order IDs to delete:`, ordersToDelete);
    
    if (ordersToDelete.length > 0) {
      const { error: deleteError, data: deleteData } = await supabase
        .from("orders")
        .delete()
        .in("id", ordersToDelete)
        .select();

      if (deleteError) {
        console.error("❌ Error deleting expired orders:", deleteError);
        console.error("   Error details:", JSON.stringify(deleteError, null, 2));
        return new Response("Failed to delete expired orders", { status: 500 });
      }

      console.log(`✅ Successfully deleted ${ordersToDelete.length} expired unpaid order(s)`);
      console.log(`   Deleted order IDs:`, deleteData?.map(o => o.id) || []);
      return new Response(`Cleaned up ${ordersToDelete.length} expired order(s)`, { status: 200 });
    } else {
      console.log("✅ No expired orders to delete");
      return new Response("No expired orders to clean up", { status: 200 });
    }
  } catch (error) {
    console.error("❌ Unexpected error in cleanup function:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
