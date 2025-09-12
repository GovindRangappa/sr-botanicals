// supabase/functions/cleanup-pending-orders/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("orders")
    .delete()
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString()) // 10 minutes ago
    .eq("status", "unpaid"); // ✅ changed from "pending" to "unpaid"

  if (error) {
    console.error("❌ Error deleting old unpaid orders:", error);
    return new Response("Failed to clean unpaid orders", { status: 500 });
  }

  console.log("✅ Successfully cleaned up old unpaid orders");
  return new Response("Cleanup complete", { status: 200 });
});
