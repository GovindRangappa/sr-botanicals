import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Shippo } from 'shippo';
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmation";
import { sendOwnerPickupNotificationEmail } from "@/lib/email/sendOwnerPickupNotification";
import { sendOwnerShippingNotificationEmail } from "@/lib/email/sendOwnerShippingNotification";
import { sendShipmentConfirmationEmail } from "@/lib/email/sendShipmentConfirmation";

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

    // ✅ Owner notification for Paid Shipping (send only once)
    // IMPORTANT: Do NOT send for Local Pickup or Hand Delivery orders
    const isHandDeliveryOrder = isHandDelivery(order.shipping_method);
    const isLocalPickupOrder = isLocalPickup(order.shipping_method);
    
    console.log("🔍 Shipping notification decision:", {
      shipping_method: order.shipping_method,
      isLocalPickup: isLocalPickupOrder,
      isHandDelivery: isHandDeliveryOrder,
      owner_shipping_email_sent: order.owner_shipping_email_sent,
    });

    // Explicitly skip shipping notification for Hand Delivery and Local Pickup
    if (isHandDeliveryOrder) {
      console.log("⏭️ SKIPPING owner shipping notification - this is a Hand Delivery order");
    } else if (isLocalPickupOrder) {
      console.log("⏭️ SKIPPING owner shipping notification - this is a Local Pickup order");
    } else if (!order.owner_shipping_email_sent) {
      // Only send for actual paid shipping orders
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
    } else if (order.owner_shipping_email_sent) {
      console.log("ℹ️ Owner shipping notification already sent");
    }

    // 📦 Create shipping label and send shipment confirmation email for paid shipping orders
    if (
      order.shipment_id &&
      !isLocalPickupOrder &&
      !isHandDeliveryOrder &&
      order.status === 'paid'
    ) {
      try {
        const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

        console.log('🚚 Creating shipping label for manual order:', {
          orderId: orderId,
          shipment_id: order.shipment_id,
          shipping_method: order.shipping_method,
        });

        // Fetch the shipment from Shippo
        const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${order.shipment_id}`, {
          headers: {
            Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        const shipment = await shipmentRes.json();

        if (!shipment.rates || shipment.rates.length === 0) {
          console.error("❌ No rates found in shipment for manual order");
        } else {
          console.log('📦 Available rates:', shipment.rates);
          console.log('🔍 Trying to match shipping_method:', order.shipping_method);

          const availableLabels = shipment.rates.map((r: any) => `${r.provider} ${r.servicelevel?.name || r.servicelevel}`);
          console.log('📬 Rate options available for matching:', availableLabels);

          // Find the matching rate
          const rate = shipment.rates.find((r: any) =>
            `${r.provider} ${r.servicelevel?.name || r.servicelevel}` === order.shipping_method
          );

          if (!rate) {
            console.error("❌ Rate matching manual order not found");
            console.error("Available rates:", availableLabels);
            console.error("Looking for:", order.shipping_method);
          } else {
            console.log("✅ Matched rate:", rate);
            
            // Create the shipping label
            const transaction = await shippo.transactions.create({
              rate: rate.object_id,
              labelFileType: "PDF",
              async: false,
            });

            if (transaction.status === "SUCCESS") {
              const { trackingNumber, labelUrl } = transaction;

              // Update order with tracking info
              const { error: labelUpdateError } = await supabase
                .from('orders')
                .update({
                  tracking_number: trackingNumber,
                  label_url: labelUrl,
                })
                .eq('id', orderId);

              if (labelUpdateError) {
                console.error("❗ Failed to update manual order with label:", labelUpdateError);
              } else {
                console.log("✅ Shipping label created & saved for manual order");
              }

              // Send customer shipment confirmation email (once)
              if (!order.shipment_email_sent) {
                try {
                  await sendShipmentConfirmationEmail({
                    ...order,
                    tracking_number: trackingNumber,
                    customer_first_name: order.first_name || order.customer_first_name,
                  });

                  await supabase
                    .from("orders")
                    .update({ shipment_email_sent: true })
                    .eq("id", orderId);

                  results.shipmentEmail = true;
                  console.log("✓ Shipment confirmation email sent (manual order)");
                } catch (err) {
                  console.error("❌ Failed to send shipment confirmation email (manual order):", err);
                }
              } else {
                console.log("ℹ️ Shipment confirmation email already sent");
              }
            } else {
              console.error("❌ Shippo label creation failed for manual order:", transaction.messages);
            }
          }
        }
      } catch (err) {
        console.error("🚨 Error during label creation for manual order:", err);
        // Don't fail the entire request if label creation fails
      }
    } else if (order.shipment_id && !isLocalPickupOrder && !isHandDeliveryOrder) {
      console.log("ℹ️ Skipping label creation - order not paid yet");
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

