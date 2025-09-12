// pages/api/stripe-webhook.ts
import { buffer } from 'micro';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Shippo } from 'shippo';

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
      } = session;

      console.log('👤 Stripe customer ID from session:', customer);
      console.log('🔍 Looking up checkout ID in Supabase:', checkout_id);

      let { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_checkout_id', checkout_id);

      if (fetchError) {
        console.error('❌ Error fetching order from Supabase:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch order' });
      }

      // 🔁 If no match by checkout ID, try fallback to manual orders
      if (!existingOrders || existingOrders.length === 0) {
        console.warn(`⚠️ No matching order found for checkout ID ${checkout_id}`);

        const { data: manualOrder, error: manualError } = await supabase
          .from("orders")
          .select("*")
          .eq("customer_email", session.customer_details?.email ?? '')
          .eq("status", "paid")
          .eq("stripe_checkout_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (manualError) {
          console.error('❌ Manual order fetch error:', manualError);
          return res.status(404).json({ error: 'No matching manual order found' });
        }

        if (manualOrder) {
          console.log('✅ Matched manual order:', manualOrder.id);
          existingOrders = [manualOrder];
        } else {
          return res.status(404).json({ error: 'No matching order found to update' });
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

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          stripe_payment_intent_id: payment_intent as string,
          stripe_customer_id: customer as string,
          products,
          subtotal,
          status: 'paid',
          fulfillment_status: 'unfulfilled',
          payment_method: 'card',
        })
        .eq('stripe_checkout_id', checkout_id);

      if (updateError) {
        console.error('❗ Supabase update error:', updateError);
      } else {
        console.log(`✅ Order updated successfully for session ${checkout_id}`);
      }


      const paidOrder = existingOrders[0];

      if (paidOrder.shipment_id && paidOrder.shipping_method !== 'Local Pickup' && paidOrder.shipping_method !== 'Hand Delivery') {
        try {
          const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });


          console.log('🚚 Fetching shipment with ID:', paidOrder.shipment_id);

          const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${paidOrder.shipment_id}`, {
            headers: {
              Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          const shipment = await shipmentRes.json();

          console.log('📦 Available rates:', shipment.rates);
          console.log('🔍 Trying to match shipping_method:', paidOrder.shipping_method);

          const availableLabels = shipment.rates.map((r: any) => `${r.provider} ${r.servicelevel.name}`);
          console.log('📬 Rate options available for matching:', availableLabels);

          const rate = shipment.rates.find((r: any) =>
            `${r.provider} ${r.servicelevel.name}` === paidOrder.shipping_method
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
                .eq('id', paidOrder.id);

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

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('❗ Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
