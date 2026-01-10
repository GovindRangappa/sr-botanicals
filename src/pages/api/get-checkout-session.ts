// pages/api/get-checkout-session.ts
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
    const { session_id, customer_email } = req.body;
    
    // Validate inputs
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ message: "Invalid session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent.latest_charge"],
    });

    // Validate session ownership - verify customer email matches if provided
    if (customer_email && session.customer_email) {
      if (session.customer_email.toLowerCase() !== customer_email.toLowerCase()) {
        return res.status(403).json({ message: "Session does not belong to this customer" });
      }
    }

    // Additional validation: Check if session exists in our orders database
    // This provides an extra layer of security
    if (session.metadata?.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_email')
        .eq('id', session.metadata.order_id)
        .single();

      if (!orderError && order && customer_email) {
        if (order.customer_email?.toLowerCase() !== customer_email.toLowerCase()) {
          return res.status(403).json({ message: "Unauthorized access to session" });
        }
      }
    }

    // Safely extract receipt URL from payment intent
    let receiptUrl: string | null = null;
    
    if (session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : (session.payment_intent as Stripe.PaymentIntent).id;

      try {
        // Retrieve payment intent with charge expansion
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['latest_charge'],
        });

        const latestCharge = paymentIntent.latest_charge;
        
        if (latestCharge) {
          if (typeof latestCharge === 'string') {
            // If it's just an ID, retrieve the charge
            const charge = await stripe.charges.retrieve(latestCharge);
            receiptUrl = charge.receipt_url || null;
          } else {
            // If it's already expanded
            receiptUrl = (latestCharge as Stripe.Charge).receipt_url || null;
          }
        }
      } catch (chargeError) {
        console.error('❌ Error retrieving charge/receipt:', chargeError);
        // Continue without receipt URL - it's not critical
      }
    }

    res.status(200).json({ receipt_url: receiptUrl });
  } catch (err: any) {
    console.error("❌ Failed to fetch Stripe receipt URL:", err);
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ message: "Invalid session ID" });
    }
    res.status(500).json({ message: "Stripe fetch failed" });
  }
}
