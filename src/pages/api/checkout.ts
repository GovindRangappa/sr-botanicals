// pages/api/checkout.ts

import { Shippo } from "shippo";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { cart, shippingRateId, shippingInfo, shippingMethod, shipmentId } = req.body;

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({ message: "Invalid cart data" });
    }

    let shippingAmount = 0;
    let shippingLabel = "";
    let estimated_days = null;
    let trackingNumber = null;
    let labelUrl = null;


    let resolvedShipmentId: string | null = null; // 🔁 Moved to outer scope

    if (shippingRateId) {
      const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

      // ✅ Retrieve the previously created shipment instead of creating a new one
      const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${shipmentId}`, {
        method: 'GET',
        headers: {
          Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const shipment = await shipmentRes.json();


      if (!shipment || !shipment.rates) {
        return res.status(400).json({ message: "Failed to retrieve shipment or rates" });
      }

      const rate = shipment.rates.find((r: any) => r.object_id === shippingRateId);
      if (!rate) {
        return res.status(400).json({ message: "Matching shipping rate not found in shipment" });
      }

      // ✅ Step 3: DO NOT create the label here, just store shipment.object_id
      resolvedShipmentId = shipment.object_id; // ✅ Just assigning now


      shippingAmount = Math.round(parseFloat(rate.amount) * 100);
      shippingLabel = `${rate.provider} ${rate.servicelevel.name}`;
      estimated_days = rate.estimated_days;
    } else if (shippingMethod) {
      shippingLabel = shippingMethod;
      shippingAmount = 0;
      estimated_days = null;
    } else {
      return res.status(400).json({ message: "Missing shipping information" });
    }

    // ✅ Calculate subtotal and tax
    const subtotalCents = cart.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0
    );
    const taxCents = Math.round(subtotalCents * 0.0825);

    // ✅ Stripe line items
    const line_items = [
      ...cart.map((item: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      ...(shippingAmount > 0
        ? [{
            price_data: {
              currency: "usd",
              product_data: {
                name: `Shipping - ${shippingLabel}`,
              },
              unit_amount: shippingAmount,
            },
            quantity: 1,
          }]
        : []),
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Sales Tax (8.25%)",
          },
          unit_amount: taxCents,
        },
        quantity: 1,
      },
    ];

    // ✅ Stripe customer check
    let customerId: string | undefined;

    const existingCustomers = await stripe.customers.list({
      email: shippingInfo.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: shippingInfo.email,
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
      });
      customerId = newCustomer.id;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/checkout`,
      billing_address_collection: 'auto',
      customer: customerId,
    });

    // ✅ Check if order with this checkout_id already exists (prevent duplicates)
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_checkout_id', session.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = "not found" error, which is expected for new orders
      console.error('❗ Error checking for existing order:', checkError);
      return res.status(500).json({ message: "Failed to check for existing order" });
    }

    if (existingOrder) {
      console.log('⚠️ Order with this checkout_id already exists:', existingOrder.id);
      // Return the existing session URL instead of creating a duplicate
      return res.status(200).json({ url: session.url });
    }

    // ✅ Ensure customer record exists / is updated
    try {
      const { data: existingCustomer, error: customerLookupError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .eq('email', shippingInfo.email)
        .single();

      if (customerLookupError && customerLookupError.code !== 'PGRST116') {
        throw customerLookupError;
      }

      if (!existingCustomer) {
        const { error: insertCustomerError } = await supabase.from('customers').insert([
          {
            first_name: shippingInfo.firstName,
            last_name: shippingInfo.lastName,
            email: shippingInfo.email,
            phone: shippingInfo.phone ?? null,
          },
        ]);

        if (insertCustomerError) {
          console.error('❗ Failed to insert customer record', insertCustomerError);
        }
      } else {
        const updates: Record<string, string> = {};

        if (!existingCustomer.first_name && shippingInfo.firstName) {
          updates.first_name = shippingInfo.firstName;
        }
        if (!existingCustomer.last_name && shippingInfo.lastName) {
          updates.last_name = shippingInfo.lastName;
        }
        if (shippingInfo.phone && shippingInfo.phone !== (existingCustomer as any).phone) {
          updates.phone = shippingInfo.phone;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateCustomerError } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', existingCustomer.id);

          if (updateCustomerError) {
            console.error('❗ Failed to update customer record', updateCustomerError);
          }
        }
      }
    } catch (customerSyncError) {
      console.error('❗ Customer sync error:', customerSyncError);
    }

    // ✅ Supabase order logging
    const order = {
      stripe_checkout_id: session.id,
      status: "unpaid",
      customer_email: shippingInfo.email ?? null,
      first_name: shippingInfo.firstName,
      last_name: shippingInfo.lastName,

      products: cart.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),

      shipping_method: shippingLabel ?? shippingMethod ?? 'Standard',
      shipping_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
      shipping_street1: shippingInfo.street,
      shipping_city: shippingInfo.city,
      shipping_state: shippingInfo.state,
      shipping_zip: shippingInfo.zip,
      shipping_estimated_days: estimated_days,

      subtotal: subtotalCents / 100,
      tax: taxCents / 100,
      shipping_cost: shippingAmount / 100,
      fulfillment_status: "unfulfilled",

      tracking_number: null,
      label_url: null,
      shipment_id: shippingRateId ? resolvedShipmentId : null,
    };

    const { error } = await supabase.from("orders").insert([order]);
    if (error) {
      console.error("❗ Supabase insert error:", error);
      return res.status(500).json({ message: "Order insert failed" });
    }

    res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error("❌ Stripe checkout error:", error);
    res.status(500).json({ message: "Checkout failed" });
  }
}
