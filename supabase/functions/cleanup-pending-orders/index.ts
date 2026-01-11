// supabase/functions/cleanup-pending-orders/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
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
      return new Response("No orders to clean up", { status: 200 });
    }

    console.log(`🔍 Found ${unpaidOrders.length} unpaid order(s) to check`);

    const ordersToDelete: string[] = [];

    // Check each order's Stripe session status
    for (const order of unpaidOrders) {
      if (!order.stripe_checkout_id) {
        // Skip orders without a checkout ID (these might be manual/invoice orders)
        continue;
      }

      try {
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

        if (!stripeResponse.ok) {
          // If session not found (404), it might have been deleted or never existed
          // In this case, we'll skip it to be safe
          if (stripeResponse.status === 404) {
            console.log(`⚠️ Stripe session ${order.stripe_checkout_id} not found, skipping order ${order.id}`);
            continue;
          }
          
          console.error(`❌ Error fetching Stripe session ${order.stripe_checkout_id}: ${stripeResponse.status}`);
          continue;
        }

        const session = await stripeResponse.json();

        // Check if session is expired
        // A session is expired if status is 'expired' OR expires_at is in the past
        const isExpired = 
          session.status === "expired" || 
          (session.expires_at && session.expires_at * 1000 < Date.now());

        if (isExpired) {
          console.log(`✅ Session ${order.stripe_checkout_id} is expired, marking order ${order.id} for deletion`);
          ordersToDelete.push(order.id);
        } else {
          console.log(`⏭️ Session ${order.stripe_checkout_id} is still active (status: ${session.status}), keeping order ${order.id}`);
        }
      } catch (error) {
        console.error(`❌ Error checking Stripe session for order ${order.id}:`, error);
        // On error, skip this order to be safe - don't delete if we can't verify
        continue;
      }
    }

    // Delete only the orders with expired Stripe sessions
    if (ordersToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .in("id", ordersToDelete);

      if (deleteError) {
        console.error("❌ Error deleting expired orders:", deleteError);
        return new Response("Failed to delete expired orders", { status: 500 });
      }

      console.log(`✅ Successfully deleted ${ordersToDelete.length} expired unpaid order(s)`);
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
