// pages/api/create-stripe-product.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const { name, price } = req.body;

  console.log('📦 Incoming create-stripe-product request:', { name, price });

  try {
    // 1. Create the product
    const product = await stripe.products.create({ name });
    console.log('✅ Stripe product created:', product.id);

    // 2. Create a one-time price
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(price * 100), // in cents
      currency: 'usd',
      product: product.id,
    });
    console.log('💲 Stripe price created:', stripePrice.id);

    res.status(200).json({ stripe_price_id: stripePrice.id });
  } catch (err: any) {
    console.error('❌ Stripe product creation failed:', err.message || err);
    res.status(500).json({ error: 'Stripe product creation failed' });
  }
}
