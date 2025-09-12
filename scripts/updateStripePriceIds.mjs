import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function updateSupabaseWithStripePriceIds() {
  const stripeProducts = await stripe.products.list({ limit: 100 });

  for (const stripeProduct of stripeProducts.data) {
    const prices = await stripe.prices.list({ product: stripeProduct.id });
    const defaultPrice = prices.data[0];

    if (!defaultPrice) {
      console.warn(`No price found for product ${stripeProduct.name}`);
      continue;
    }

    const { error } = await supabase
      .from('products')
      .update({ stripe_price_id: defaultPrice.id })
      .eq('name', stripeProduct.name);

    if (error) {
      console.error(`❌ Failed to update ${stripeProduct.name}:`, error.message);
    } else {
      console.log(`✅ Updated ${stripeProduct.name} → ${defaultPrice.id}`);
    }
  }

  console.log('🟢 Done syncing Stripe price IDs with Supabase.');
}

updateSupabaseWithStripePriceIds();
