// scripts/uploadStripeProducts.cjs
const Stripe = require('stripe');
require('dotenv').config();
const { products } = require('../src/data/productsData.cjs');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function uploadProducts() {
  for (const product of products) {
    try {
      const stripeProduct = await stripe.products.create({
        name: product.name,
      });

      await stripe.prices.create({
        unit_amount: Math.round(product.price * 100),
        currency: 'usd',
        product: stripeProduct.id,
      });

      console.log(`✅ Uploaded: ${product.name}`);
    } catch (err) {
      console.error(`❌ Failed to upload ${product.name}:`, err.message);
    }
  }
}

uploadProducts();
