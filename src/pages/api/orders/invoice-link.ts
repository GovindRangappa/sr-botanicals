import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('stripe_invoice_id, stripe_payment_intent_id, stripe_checkout_id')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    console.error('❌ Failed to load order for invoice lookup:', error);
    return res.status(404).json({ error: 'Order not found' });
  }

  try {
    if (order.stripe_invoice_id) {
      let invoice = await stripe.invoices.retrieve(order.stripe_invoice_id);

      if (invoice.status === 'draft') {
        invoice = await stripe.invoices.finalizeInvoice(order.stripe_invoice_id);
      }

      let receiptUrl: string | null = null;

      if (invoice.charge) {
        const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge.id;
        const charge = await stripe.charges.retrieve(chargeId);
        receiptUrl = charge.receipt_url ?? null;
      }

      return res.status(200).json({
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        invoicePdfUrl: invoice.invoice_pdf ?? null,
        receiptUrl,
      });
    }

    if (order.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {
        expand: ['latest_charge'],
      });

      const latestCharge = paymentIntent.latest_charge;
      if (latestCharge && typeof latestCharge !== 'string') {
        return res.status(200).json({
          hostedInvoiceUrl: null,
          invoicePdfUrl: null,
          receiptUrl: latestCharge.receipt_url ?? null,
        });
      }

      if (latestCharge && typeof latestCharge === 'string') {
        const charge = await stripe.charges.retrieve(latestCharge);
        return res.status(200).json({
          hostedInvoiceUrl: null,
          invoicePdfUrl: null,
          receiptUrl: charge.receipt_url ?? null,
        });
      }
    }

    return res.status(200).json({
      hostedInvoiceUrl: null,
      invoicePdfUrl: null,
      receiptUrl: null,
    });
  } catch (err: any) {
    console.error('❌ Failed to retrieve invoice/receipt link:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to retrieve invoice' });
  }
}

