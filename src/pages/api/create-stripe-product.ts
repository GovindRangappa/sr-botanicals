// pages/api/create-stripe-product.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return; // Response already sent by requireAdmin

  const { name, price } = req.body;

  // Validate inputs
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid product name' });
  }

  if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
    return res.status(400).json({ error: 'Invalid price' });
  }

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
