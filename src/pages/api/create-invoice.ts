import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return; // Response already sent by requireAdmin

  try {
    const {
      first_name,
      last_name,
      email,
      products,
      shipping_cost,
      tax,
      orderId,
      mark_as_paid,
    } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    // 1. Create or retrieve customer
    const existingCustomers = await stripe.customers.list({ email });
    const customer = existingCustomers.data[0] || await stripe.customers.create({
      email,
      name: `${first_name} ${last_name}`,
    });

    // Save stripe_customer_id to the order
    await supabase
    .from('orders')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orderId);


    // 2. Create the invoice FIRST (in draft mode)
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 7,
      auto_advance: false,
      metadata: {
        order_id: orderId,
      },
    });

    console.log('📋 Draft invoice created:', invoice.id);

    // 3. Create invoice items and attach to invoice
    const invoiceItemIds: string[] = [];

    for (const item of products) {
      console.log(`🧪 Checking product: ${item.name}`);

      const { data: productRow, error: productErr } = await supabase
        .from('products')
        .select('id, stripe_price_id')
        .eq('name', item.name)
        .single();

      if (productErr || !productRow) {
        console.warn(`❌ Product not found in products table: ${item.name}`, productErr);
        continue;
      }

      console.log(`🔍 Product row:`, productRow);
      let stripePriceId = productRow.stripe_price_id;

      if (!stripePriceId) {
        console.log(`↪️ No stripe_price_id in products. Checking variants for product_id: ${productRow.id}, size: ${item.size}`);

        const { data: variantRow, error: variantErr } = await supabase
          .from('product_variants')
          .select('stripe_price_id')
          .eq('product_id', productRow.id)
          .eq('size', item.size)
          .single();

        if (variantErr || !variantRow) {
          console.warn(`⚠️ Variant fetch error for ${item.name} (${item.size}):`, variantErr || 'No variant found');
          continue;
        }

        stripePriceId = variantRow.stripe_price_id;
        console.log(`✅ Fetched stripe_price_id from variant: ${stripePriceId}`);
      } else {
        console.log(`✅ Using stripe_price_id from products: ${stripePriceId}`);
      }

      if (!stripePriceId) {
        console.error(`❌ Missing Stripe price ID for product: ${item.name}`);
        continue;
      }

      // Try creating invoice item with Stripe price ID
      try {
        const stripePrice = await stripe.prices.retrieve(stripePriceId);

        if (!stripePrice.active) {
          console.error(`❌ Stripe price ${stripePriceId} is inactive`);
          continue;
        }

        const invoiceItem = await stripe.invoiceItems.create({
          customer: customer.id,
          price: stripePriceId,
          quantity: item.quantity,
          invoice: invoice.id, // ✅ Attach to this invoice
        });

        console.log(`✅ Invoice item created:`, {
          id: invoiceItem.id,
          amount: invoiceItem.amount,
          quantity: invoiceItem.quantity,
        });

        invoiceItemIds.push(invoiceItem.id);
      } catch (err) {
        console.error(`❌ Failed to retrieve/use Stripe price ${stripePriceId}:`, err);
        console.log(`🔄 Creating fallback invoice item for ${item.name} at $${item.price}`);

        const fallbackItem = await stripe.invoiceItems.create({
          customer: customer.id,
          amount: Math.round(item.price * item.quantity * 100),
          currency: 'usd',
          description: `${item.name} (Qty: ${item.quantity})`,
          invoice: invoice.id, // ✅ Attach fallback to invoice
        });

        console.log(`✅ Fallback invoice item created:`, {
          id: fallbackItem.id,
          amount: fallbackItem.amount,
          description: fallbackItem.description,
        });

        invoiceItemIds.push(fallbackItem.id);
      }
    }

    // 4. Add shipping cost if needed
    // Add shipping as a separate invoice item if cost > 0
    if (shipping_cost && shipping_cost > 0) {
        const shippingItem = await stripe.invoiceItems.create({
            customer: customer.id,
            amount: Math.round(shipping_cost * 100), // in cents
            currency: 'usd',
            description: 'Shipping',
            invoice: invoice.id,
        });
        invoiceItemIds.push(shippingItem.id);
        console.log('🚚 Shipping invoice item created:', shippingItem);
    }


    // 5. Add tax if needed
    if (tax > 0) {
      const taxItem = await stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(tax * 100),
        currency: 'usd',
        description: 'Sales Tax (8.25%)',
        invoice: invoice.id,
      });
      invoiceItemIds.push(taxItem.id);
    }

    // 6. Prevent invoice creation if no line items were valid
    if (invoiceItemIds.length === 0) {
      return res.status(400).json({ error: 'No valid invoice items could be created' });
    }

    // 7. Retrieve the invoice again with line items
    const invoiceWithLines = await stripe.invoices.retrieve(invoice.id, {
      expand: ['lines'],
    });

    console.log('💵 Refreshed invoice:', {
      id: invoiceWithLines.id,
      total: invoiceWithLines.total,
      amount_due: invoiceWithLines.amount_due,
      line_items_count: invoiceWithLines.lines?.data?.length,
    });

    // 8. Only send if there's actually something to pay
    if (invoiceWithLines.amount_due > 0) {
        let finalInvoice;

        if (mark_as_paid) {
            finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
            await stripe.invoices.pay(finalInvoice.id, {
            paid_out_of_band: true,
            });
            console.log('💵 Invoice manually marked as paid');
        } else {
            finalInvoice = await stripe.invoices.sendInvoice(invoice.id);
            console.log('📤 Invoice sent:', finalInvoice.hosted_invoice_url);
        }

        // Save invoice ID
        await supabase
            .from('orders')
            .update({ stripe_invoice_id: finalInvoice.id })
            .eq('id', orderId);

        return res.status(200).json({
            message: mark_as_paid ? 'Invoice marked as paid' : 'Invoice sent',
            hostedInvoiceUrl: finalInvoice.hosted_invoice_url,
        });
     } else {
      console.warn('⚠️ Invoice total is $0.00 - not sending');
      return res.status(400).json({
        error: 'Invoice total is $0.00',
        invoiceId: invoice.id,
      });
    }

  } catch (error: any) {
    console.error('❌ Could not create Stripe invoice', error);
    res.status(400).json({ error: error.message || 'Unknown error' });
  }
}
