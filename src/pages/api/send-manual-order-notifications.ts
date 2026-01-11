import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmation";
import { sendOwnerPickupNotificationEmail } from "@/lib/email/sendOwnerPickupNotification";
import { sendOwnerHandDeliveryNotificationEmail } from "@/lib/email/sendOwnerHandDeliveryNotification";
import { sendOwnerShippingNotificationEmail } from "@/lib/email/sendOwnerShippingNotification";
// ⚠️ sendShipmentConfirmationEmail is NOT used here - shipment emails are only sent from /api/create-shipping-label (manual)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to check if shipping method is Local Pickup
function isLocalPickup(shippingMethod: string | null | undefined): boolean {
  if (!shippingMethod) return false;
  const normalized = shippingMethod.trim();
  return normalized === "Local Pickup";
}

// Helper function to check if shipping method is Hand Delivery
function isHandDelivery(shippingMethod: string | null | undefined): boolean {
  if (!shippingMethod) return false;
  const normalized = shippingMethod.trim();
  // Check for Hand Delivery (case-insensitive for safety)
  return normalized === "Hand Delivery" || 
         normalized.toLowerCase() === "hand delivery";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // Get base URL for packing slip link
  const baseUrl = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'https://sr-botanicals.vercel.app';

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
    // Cash payments are always paid, so we check both status and payment method
    const isCashPayment = order.payment_method === 'cash';
    if (order.status !== 'paid' && !isCashPayment) {
      return res.status(400).json({ error: 'Order is not paid' });
    }
    
    // If it's a cash payment but status is not 'paid', update it
    if (isCashPayment && order.status !== 'paid') {
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
      order.status = 'paid'; // Update local object for consistency
    }

    const results = {
      confirmationEmail: false,
      ownerPickupEmail: false,
      ownerShippingEmail: false,
      shipmentEmail: false,
    };

    // Debug logging
    console.log("📦 Manual order notification check:", {
      orderId: orderId,
      shipping_method: order.shipping_method,
      isLocalPickup: isLocalPickup(order.shipping_method),
      isHandDelivery: isHandDelivery(order.shipping_method),
      owner_pickup_email_sent: order.owner_pickup_email_sent,
      owner_shipping_email_sent: order.owner_shipping_email_sent,
      status: order.status,
      payment_method: order.payment_method,
    });

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
      isLocalPickup(order.shipping_method) &&
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
    } else if (isLocalPickup(order.shipping_method)) {
      console.log("ℹ️ Owner pickup notification already sent");
    }

    // ✅ Owner notification for Hand Delivery (send only once)
    // Reusing owner_pickup_email_sent flag since Local Pickup and Hand Delivery are mutually exclusive
    const isHandDeliveryOrder = isHandDelivery(order.shipping_method);
    const isLocalPickupOrder = isLocalPickup(order.shipping_method);
    
    console.log("🔍 [Manual Order] Checking Hand Delivery notification:", {
      shipping_method: order.shipping_method,
      isHandDelivery: isHandDeliveryOrder,
      owner_pickup_email_sent: order.owner_pickup_email_sent,
      orderId: orderId,
    });

    if (
      isHandDeliveryOrder &&
      !order.owner_pickup_email_sent
    ) {
      console.log("✅ [Manual Order] Conditions met, sending Hand Delivery notification");
      try {
        await sendOwnerHandDeliveryNotificationEmail(order);
        await supabase
          .from("orders")
          .update({ owner_pickup_email_sent: true })
          .eq("id", orderId);
        results.ownerPickupEmail = true;
        console.log("🚗 Owner Hand Delivery notification sent (manual order)");
      } catch (err) {
        console.error("❌ Failed to send owner hand delivery notification (manual order):", err);
      }
    } else if (isHandDeliveryOrder) {
      console.log("⏭️ [Manual Order] Skipping Hand Delivery notification - already sent (owner_pickup_email_sent is true)");
    } else {
      console.log("⏭️ [Manual Order] Skipping Hand Delivery notification - not a Hand Delivery order");
    }

    // ✅ Owner notification for Paid Shipping (send only once, without label)
    // 📦 Label creation is now manual - done via admin "Create Label" button
    // This allows owner to create labels when ready to ship, not when payment is received
    if (
      !isLocalPickupOrder &&
      !isHandDeliveryOrder &&
      !order.owner_shipping_email_sent
    ) {
      try {
        await sendOwnerShippingNotificationEmail(order, baseUrl);
        await supabase
          .from("orders")
          .update({ owner_shipping_email_sent: true })
          .eq("id", orderId);
        results.ownerShippingEmail = true;
        console.log("✔ Owner shipping notification sent (manual order - label will be created manually)");
      } catch (err: any) {
        console.error("❌ Failed to send owner shipping notification:", err);
        results.ownerShippingEmail = false;
      }
    } else if (isLocalPickupOrder || isHandDeliveryOrder) {
      console.log("⏭️ [Manual Order] Skipping owner shipping notification - Local Pickup or Hand Delivery order");
    } else if (order.owner_shipping_email_sent) {
      console.log("ℹ️ Owner shipping notification already sent");
    }

    console.log("✅ Manual order notifications processed successfully");
    console.log("📊 Final notification results:", results);
    
    const response = {
      success: true,
      notifications: results,
      debug: {
        shipping_method: order.shipping_method,
        owner_shipping_email_sent: order.owner_shipping_email_sent,
        isLocalPickup: isLocalPickupOrder,
        isHandDelivery: isHandDeliveryOrder,
      },
    };
    
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Error sending manual order notifications:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notifications' });
  }
}

