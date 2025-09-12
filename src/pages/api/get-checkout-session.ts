// pages/api/get-checkout-session.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { session_id } = req.body;
    console.log("🔍 Received session_id:", session_id);

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent.latest_charge"], // ✅ KEY CHANGE HERE
    });

    console.log("📦 Full session object:", JSON.stringify(session, null, 2));

    const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
    const latestCharge = paymentIntent.latest_charge as Stripe.Charge;
    const receiptUrl = latestCharge?.receipt_url;

    console.log("🧾 Extracted receipt URL:", receiptUrl);

    res.status(200).json({ receipt_url: receiptUrl });
  } catch (err) {
    console.error("❌ Failed to fetch Stripe receipt URL:", err);
    res.status(500).json({ message: "Stripe fetch failed" });
  }
}
