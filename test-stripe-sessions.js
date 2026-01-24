// Test script to check Stripe session status for old unpaid orders
// Run with: node test-stripe-sessions.js

import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Add your old unpaid order checkout session IDs here
const testSessionIds = [
  'cs_live_b1mv1iDTyTi1ZhyXLvPvxLxtiK9O2zl35VY1yOoDLgQyABQQoQpJGsNM9e',  // From your orders table
  'cs_live_b1YlTqs34zsrJVyo9k6cVTv4b1Cz8BRlLKD2LPkrdRwrfU5VwuqqBrADJC',
  'cs_live_b1Ys87In0NadmMnMW3BtQnyBFSHxCItnnSoJIZgBBPFTyzLL9CpnYEEZJl',
  'cs_live_b1NDXrvEKDIVTXGOnFERzIgXmv1izADnvYKRB8CaLwTpvuWkfgT9imL93t',
  'cs_live_b187XLXXyk0A1nruScOf5zuZdBirFXc85umyukpUbVHDLsp5Jpz3xNeM81',
  'cs_live_b1r8KZSlh57F06wiEgCHyt4nRUPCqMZhapAeE5iYXT4kYQVsWfO44AvcHo',
  'cs_live_b1r1qLYQ2S3vhzvdeTKUGcW2rODChomfnhe6JvPeZx0guLZzedXCd9U0os',
  'cs_live_b1uUbmml0pZZiFCiE8TxbTf6oHk8ZZ3QdFVXGVymodZf8Cl9n8U2tGxRyD',
  'cs_live_b1qLaL7LTk870cuMrdedTzct8J6l1FVohFc5ZHonnJmUfkRWOMOMRBm5Y0',
  'cs_live_b13VxCtjVcmy9t9ZytNsHe2Utaw9KdIOz8LEWLdxh5FAQ401MjB3mjo9X2',
  'cs_live_b1gp3q5KVGB1sTB8971vFegRe38CwOcbGRV9tX8QmTWxpDNVmhW2SF6ESg',
];

async function testSessions() {
  console.log('🔍 Testing Stripe Session Status...\n');

  for (const sessionId of testSessionIds) {
    try {
      console.log(`\n📋 Checking session: ${sessionId}`);
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log('✅ Session found!');
      console.log('   Status:', session.status);
      console.log('   Expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'null');
      console.log('   Payment status:', session.payment_status);
      console.log('   Created:', new Date(session.created * 1000).toISOString());
      
      // Check our expiration logic
      const isExpired = 
        session.status === "expired" || 
        (session.expires_at && session.expires_at * 1000 < Date.now());
      
      console.log('   Is expired (our logic):', isExpired);
      console.log('   Should delete:', isExpired);
      
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('❌ Session NOT FOUND (404)');
        console.log('   This means the session was deleted/expired');
        console.log('   Should delete: YES (404 = expired)');
      } else {
        console.log('❌ Error:', error.message);
        console.log('   Status code:', error.statusCode);
      }
    }
  }
  
  console.log('\n✅ Test complete!');
}

testSessions().catch(console.error);
