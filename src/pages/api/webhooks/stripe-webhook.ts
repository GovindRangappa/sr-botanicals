// pages/api/stripe-webhook.ts
import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Shippo } from 'shippo';
import { sendOrderConfirmationEmail } from "@/lib/email/sendOrderConfirmation";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📩 Incoming Stripe webhook');

  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  try {
    const event = stripe.webhooks.constructEvent(
      buf,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      console.log('📦 Event Type: checkout.session.completed');

      const session = event.data.object as Stripe.Checkout.Session;
      const {
        id: checkout_id,
        payment_intent,
        customer,
        payment_status,
      } = session;

      console.log('👤 Stripe customer ID from session:', customer);
      console.log('💳 Payment status:', payment_status);
      console.log('🔍 Looking up checkout ID in Supabase:', checkout_id);

      let { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_checkout_id', checkout_id);

      if (fetchError) {
        console.error('❌ Error fetching order from Supabase:', fetchError);
        res.status(500).end();
        return;
      }

      // 🔁 If no match by checkout ID, try fallback by email and unpaid status
      if (!existingOrders || existingOrders.length === 0) {
        console.warn(`⚠️ No matching order found for checkout ID ${checkout_id}, trying fallback...`);

        const customerEmail = session.customer_details?.email;
        if (!customerEmail) {
          console.error('❌ No customer email in session');
          res.status(400).end();
          return;
        }

        // Try to find an unpaid order by email (most recent first)
        const { data: unpaidOrders, error: unpaidError } = await supabase
          .from("orders")
          .select("*")
          .eq("customer_email", customerEmail)
          .eq("status", "unpaid")
          .order("created_at", { ascending: false })
          .limit(1);

        if (unpaidError) {
          console.error('❌ Fallback order fetch error:', unpaidError);
          res.status(404).end();
          return;
        }

        if (unpaidOrders && unpaidOrders.length > 0) {
          console.log('✅ Found unpaid order by email:', unpaidOrders[0].id);
          existingOrders = unpaidOrders;
        } else {
          console.error('❌ No unpaid order found for email:', customerEmail);
          res.status(404).end();
          return;
        }
      }


      const lineItems = await stripe.checkout.sessions.listLineItems(checkout_id, {
        expand: ['data.price.product'],
      });

      console.log('🛒 Line items from Stripe:', lineItems.data);

      const products = lineItems.data
        .filter(item => !item.description?.startsWith("Shipping") && !item.description?.startsWith("Sales Tax"))
        .map(item => ({
          name: item.description,
          quantity: item.quantity,
          price: item.price?.unit_amount ? item.price.unit_amount / 100 : 0,
        }));

      const subtotal = products.reduce((sum, p) => sum + p.price * (p.quantity || 0), 0);

      const orderToUpdate = existingOrders[0];
      console.log('📝 Updating order ID:', orderToUpdate.id);

      // Guard: Skip update if order is already paid (prevents redundant work on webhook retries)
      if (orderToUpdate.status !== "paid") {
        // Retrieve Stripe receipt URL
        const paymentIntentObj = await stripe.paymentIntents.retrieve(
            payment_intent as string,
            { expand: ['latest_charge'] }
        );

        let receiptUrl: string | null = null;
        const latestCharge = paymentIntentObj.latest_charge;
        if (latestCharge && typeof latestCharge !== 'string') {
          receiptUrl = latestCharge.receipt_url ?? null;
        } else if (latestCharge && typeof latestCharge === 'string') {
          const charge = await stripe.charges.retrieve(latestCharge);
          receiptUrl = charge.receipt_url ?? null;
        }

        // Update the order - use order ID for more reliable matching
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({
            stripe_payment_intent_id: payment_intent as string,
            stripe_customer_id: customer as string,
            products,
            subtotal,
            status: 'paid',
            fulfillment_status: 'unfulfilled',
            payment_method: 'card',
            stripe_receipt_url: receiptUrl,
          })
          .eq('id', orderToUpdate.id)
          .select();

        if (updateError) {
          console.error('❗ Supabase update error:', updateError);
          console.error('❗ Update details:', {
            orderId: orderToUpdate.id,
            checkoutId: checkout_id,
            error: updateError.message,
          });
          res.status(500).end();
          return;
        } else {
          console.log(`✅ Order ${orderToUpdate.id} updated successfully for session ${checkout_id}`);
          console.log('✅ Updated order status:', updatedOrder?.[0]?.status);
        }

        // Use updated order data or fall back to original
        const orderForLabel = updatedOrder && updatedOrder[0] ? updatedOrder[0] : orderToUpdate;

        // 📸 Send order confirmation email (only once)
        if (!orderForLabel.confirmation_email_sent) {
          try {
            await sendOrderConfirmationEmail(orderForLabel);

            await supabase
              .from("orders")
              .update({ confirmation_email_sent: true })
              .eq("id", orderForLabel.id);

            console.log("✅ Order confirmation email sent");
          } catch (emailErr) {
            console.error("❌ Failed to send confirmation email:", emailErr);
          }
        } else {
          console.log("ℹ️ Confirmation email already sent");
        }

        if (orderForLabel.shipment_id && orderForLabel.shipping_method !== 'Local Pickup' && orderForLabel.shipping_method !== 'Hand Delivery') {
          try {
            const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

            console.log('🚚 Fetching shipment with ID:', orderForLabel.shipment_id);

            const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${orderForLabel.shipment_id}`, {
              headers: {
                Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });

            const shipment = await shipmentRes.json();

            console.log('📦 Available rates:', shipment.rates);
            console.log('🔍 Trying to match shipping_method:', orderForLabel.shipping_method);

            const availableLabels = shipment.rates.map((r: any) => `${r.provider} ${r.servicelevel.name}`);
            console.log('📬 Rate options available for matching:', availableLabels);

            const rate = shipment.rates.find((r: any) =>
              `${r.provider} ${r.servicelevel.name}` === orderForLabel.shipping_method
            );

            if (!rate) {
              console.error("❌ Rate matching paid order not found");
            } else {
              console.log("✅ Matched rate:", rate);
              const transaction = await shippo.transactions.create({
                rate: rate.object_id,
                labelFileType: "PDF",
                async: false,
              });

              if (transaction.status === "SUCCESS") {
                const { trackingNumber, labelUrl } = transaction;

                const { error: labelUpdateError } = await supabase
                  .from('orders')
                  .update({
                    tracking_number: trackingNumber,
                    label_url: labelUrl,
                  })
                  .eq('id', orderForLabel.id);

                if (labelUpdateError) {
                  console.error("❗ Failed to update order with label:", labelUpdateError);
                } else {
                  console.log("✅ Shipping label created & saved");
                }
              } else {
                console.error("❌ Shippo label creation failed:", transaction.messages);
              }
            }
          } catch (err) {
            console.error("🚨 Error during label creation:", err);
          }
        }
      } else {
        console.log(`ℹ️ Order ${orderToUpdate.id} is already paid, skipping update`);
      }
    }

    if (event.type === 'invoice.paid') {
      console.log('📃 Event Type: invoice.paid');

      const invoice = event.data.object as Stripe.Invoice;
      const orderId = invoice.metadata?.order_id;
      const stripeInvoiceId = invoice.id;

      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_invoice_id: stripeInvoiceId,
          })
          .eq('id', orderId);

        if (error) {
          console.error('❌ Failed to update invoice-paid order:', error);
        } else {
          console.log(`✅ Order ${orderId} marked as paid via invoice`);

          const { data: orderToLabel } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();



          console.log("📦 Checking if order is eligible for Shippo label:");
          console.log(" - shipment_id:", orderToLabel?.shipment_id);
          console.log(" - shipping_method:", orderToLabel?.shipping_method);

          if (
            orderToLabel?.shipment_id &&
            orderToLabel.shipping_method !== 'Local Pickup' &&
            orderToLabel.shipping_method !== 'Hand Delivery'
          ) {
            try {
              const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

              const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${orderToLabel.shipment_id}`, {
                headers: {
                  Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
                  'Content-Type': 'application/json',
                },
              });

              const shipment = await shipmentRes.json();

              const rate = shipment.rates.find((r: any) =>
                `${r.provider} ${r.servicelevel.name}` === orderToLabel.shipping_method
              );

              if (!rate) {
                console.error("❌ Rate matching manual invoice order not found");
              } else {
                const transaction = await shippo.transactions.create({
                  rate: rate.object_id,
                  labelFileType: "PDF",
                  async: false,
                });

                if (transaction.status === "SUCCESS") {
                  const { trackingNumber, labelUrl } = transaction;

                  const { error: labelUpdateError } = await supabase
                    .from('orders')
                    .update({
                      tracking_number: trackingNumber,
                      label_url: labelUrl,
                    })
                    .eq('id', orderId);

                  if (labelUpdateError) {
                    console.error("❗ Failed to update manual invoice order with label:", labelUpdateError);
                  } else {
                    console.log("✅ Shipping label created & saved for manual invoice order");
                  }
                } else {
                  console.error("❌ Shippo label creation failed:", transaction.messages);
                }
              }
            } catch (err) {
              console.error("🚨 Error during label creation (invoice.paid):", err);
            }
          }

        }
      } else {
        console.warn('⚠️ invoice.paid event missing order_id metadata');
      }
    }

    res.status(200).end();
    return;
  } catch (err: any) {
    console.error('❗ Webhook signature verification failed:', err.message);
    res.status(400).end();
    return;
  }
}
