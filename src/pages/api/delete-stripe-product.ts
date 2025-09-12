import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[DELETE STRIPE PRODUCT] Hit API route'); // ✅ Add this

  if (req.method !== 'POST') {
    console.log('[DELETE STRIPE PRODUCT] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stripe_price_id } = req.body;
    console.log('[DELETE STRIPE PRODUCT] Price ID:', stripe_price_id);

    // Step 1: Retrieve the price
    const price = await stripe.prices.retrieve(stripe_price_id);
    console.log('[DELETE STRIPE PRODUCT] Retrieved price:', price.id);

    // Step 2: Get the product ID from the price
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    console.log('[DELETE STRIPE PRODUCT] Associated product ID:', productId);

    // Step 3: Deactivate the product (Stripe doesn’t allow full deletion)
    const updatedProduct = await stripe.products.update(productId, { active: false });
    console.log('[DELETE STRIPE PRODUCT] Product marked inactive:', updatedProduct.id);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[DELETE STRIPE PRODUCT] Error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
