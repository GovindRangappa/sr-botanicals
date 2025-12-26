import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmation";
import { sendOwnerPickupNotificationEmail } from "@/lib/email/sendOwnerPickupNotification";
import { sendOwnerShippingNotificationEmail } from "@/lib/email/sendOwnerShippingNotification";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Failed to fetch order:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only send notifications if order is paid
    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Order is not paid' });
    }

    const results = {
      confirmationEmail: false,
      ownerPickupEmail: false,
      ownerShippingEmail: false,
    };

    // 📸 Send order confirmation email (only once)
    if (!order.confirmation_email_sent) {
      try {
        await sendOrderConfirmationEmail(order);
        await supabase
          .from("orders")
          .update({ confirmation_email_sent: true })
          .eq("id", orderId);
        results.confirmationEmail = true;
        console.log("✅ Order confirmation email sent (manual order)");
      } catch (err) {
        console.error("❌ Failed to send confirmation email (manual order):", err);
      }
    } else {
      console.log("ℹ️ Confirmation email already sent");
    }

    // ✅ Owner notification for Local Pickup (send only once)
    if (
      order.shipping_method === "Local Pickup" &&
      !order.owner_pickup_email_sent
    ) {
      try {
        await sendOwnerPickupNotificationEmail(order);
        await supabase
          .from("orders")
          .update({ owner_pickup_email_sent: true })
          .eq("id", orderId);
        results.ownerPickupEmail = true;
        console.log("☑ Owner Local Pickup notification sent (manual order)");
      } catch (err) {
        console.error("❌ Failed to send owner pickup notification (manual order):", err);
      }
    } else if (order.shipping_method === "Local Pickup") {
      console.log("ℹ️ Owner pickup notification already sent");
    }

    // ✅ Owner notification for Paid Shipping (send only once)
    if (
      order.shipping_method !== "Local Pickup" &&
      order.shipping_method !== "Hand Delivery" &&
      !order.owner_shipping_email_sent
    ) {
      try {
        await sendOwnerShippingNotificationEmail(order);
        await supabase
          .from("orders")
          .update({ owner_shipping_email_sent: true })
          .eq("id", orderId);
        results.ownerShippingEmail = true;
        console.log("✔ Owner shipping notification sent (manual order)");
      } catch (err) {
        console.error("❌ Failed to send owner shipping notification (manual order):", err);
      }
    } else if (
      order.shipping_method !== "Local Pickup" &&
      order.shipping_method !== "Hand Delivery"
    ) {
      console.log("ℹ️ Owner shipping notification already sent");
    }

    return res.status(200).json({
      success: true,
      notifications: results,
    });
  } catch (error: any) {
    console.error('❌ Error sending manual order notifications:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notifications' });
  }
}

