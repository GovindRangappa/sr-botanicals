import { NextApiRequest, NextApiResponse } from 'next';
import { Shippo } from 'shippo';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendShipmentConfirmationEmail } from '@/lib/email/sendShipmentConfirmation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔵 [MANUAL LABEL CREATION] Endpoint called:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    orderId: req.body?.orderId,
    caller: req.headers['user-agent'],
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) {
    console.log('🔴 [MANUAL LABEL CREATION] Authentication failed');
    return; // Response already sent by requireAdmin
  }

  console.log('✅ [MANUAL LABEL CREATION] Admin authenticated');

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log('🔍 [MANUAL LABEL CREATION] Processing order:', { orderId });

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate that this order is eligible for label creation
    if (order.shipping_method === 'Local Pickup' || order.shipping_method === 'Hand Delivery') {
      return res.status(400).json({ error: 'This order does not require a shipping label' });
    }

    if (!order.shipment_id) {
      return res.status(400).json({ error: 'Order does not have a shipment ID' });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid before creating a label' });
    }

    if (order.label_url) {
      return res.status(400).json({ error: 'Label already exists for this order' });
    }

    // Create the label using Shippo
    const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

    // Fetch the shipment from Shippo
    const shipmentRes = await fetch(`https://api.goshippo.com/shipments/${order.shipment_id}`, {
      headers: {
        Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const shipment = await shipmentRes.json();

    if (!shipment || !shipment.rates || shipment.rates.length === 0) {
      return res.status(400).json({ error: 'Failed to retrieve shipment or no rates available' });
    }

    // Find the matching rate based on shipping method
    const rate = shipment.rates.find((r: any) =>
      `${r.provider} ${r.servicelevel?.name || r.servicelevel}` === order.shipping_method
    );

    if (!rate) {
      return res.status(400).json({ 
        error: 'Matching shipping rate not found',
        availableRates: shipment.rates.map((r: any) => `${r.provider} ${r.servicelevel?.name || r.servicelevel}`)
      });
    }

    // Create the transaction (this creates the label with ship date = today)
    console.log('🟢 [MANUAL LABEL CREATION] Creating Shippo transaction:', {
      orderId,
      rateId: rate.object_id,
      rateService: rate.servicelevel?.name,
      rateProvider: rate.provider,
      shipDate: new Date().toISOString().split('T')[0],
    });
    
    const transaction = await shippo.transactions.create({
      rate: rate.object_id,
      labelFileType: 'PDF',
      async: false,
    });

    console.log('🟢 [MANUAL LABEL CREATION] Shippo transaction response:', {
      orderId,
      status: transaction.status,
      trackingNumber: transaction.tracking_number,
      labelUrl: transaction.label_url,
      hasMessages: !!transaction.messages?.length,
    });

    if (transaction.status !== 'SUCCESS') {
      console.error('❌ [MANUAL LABEL CREATION] Shippo label creation failed:', {
        orderId,
        messages: transaction.messages,
      });
      return res.status(500).json({ 
        error: 'Failed to create shipping label',
        details: transaction.messages
      });
    }

    const { trackingNumber, labelUrl } = transaction;

    // Get current date in YYYY-MM-DD format for ship date
    const shipDate = new Date().toISOString().split('T')[0];

    // Update the order with label information
    // First try with ship_date, if that fails (column doesn't exist), try without it
    let updateData: any = {
      tracking_number: trackingNumber,
      label_url: labelUrl,
      ship_date: shipDate,
    };
    
    let { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    // If update failed and it might be due to ship_date column not existing, try without it
    if (updateError) {
      console.error('❌ Failed to update order with label (first attempt):', updateError);
      
      // Try again without ship_date field
      updateData = {
        tracking_number: trackingNumber,
        label_url: labelUrl,
      };
      
      const { error: retryError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
        
      if (retryError) {
        console.error('❌ Failed to update order with label (retry without ship_date):', retryError);
        return res.status(500).json({ 
          error: 'Failed to save label information',
          details: retryError.message 
        });
      } else {
        console.log('⚠️ Updated order without ship_date (column may not exist)');
      }
    }

    // Send shipment confirmation email to customer (if not already sent)
    console.log('📧 [MANUAL LABEL CREATION] Checking if shipment email should be sent:', {
      orderId,
      shipment_email_sent: order.shipment_email_sent,
      trackingNumber,
    });

    if (!order.shipment_email_sent) {
      try {
        console.log('📧 [MANUAL LABEL CREATION] Sending shipment confirmation email...');
        await sendShipmentConfirmationEmail({
          ...order,
          tracking_number: trackingNumber,
        });

        await supabase
          .from('orders')
          .update({ shipment_email_sent: true })
          .eq('id', orderId);

        console.log('✅ [MANUAL LABEL CREATION] Shipment confirmation email sent successfully');
      } catch (err) {
        console.error('❌ [MANUAL LABEL CREATION] Failed to send shipment email:', err);
        // Don't fail the request if email fails
      }
    } else {
      console.log('⏭️ [MANUAL LABEL CREATION] Shipment email already sent, skipping');
    }

    return res.status(200).json({
      success: true,
      labelUrl,
      trackingNumber,
      shipDate,
    });
  } catch (error: any) {
    console.error('🚨 Error creating shipping label:', error);
    return res.status(500).json({ 
      error: 'Failed to create shipping label',
      details: error.message 
    });
  }
}

