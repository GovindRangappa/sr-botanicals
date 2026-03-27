import { NextApiRequest, NextApiResponse } from 'next';
import { Shippo } from 'shippo';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendShipmentConfirmationEmail } from '@/lib/email/sendShipmentConfirmation';
import { getTotalWeightOzForOrder } from '@/lib/shippo/orderShippingWeight';

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

    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Order must be paid before creating a label' });
    }

    if (order.label_url) {
      return res.status(400).json({ error: 'Label already exists for this order' });
    }

    const street = (order.shipping_street1 || '').trim();
    const city = (order.shipping_city || '').trim();
    const state = (order.shipping_state || '').trim();
    const zip = (order.shipping_zip || '').trim();
    if (!street || !city || !state || !zip) {
      return res.status(400).json({ error: 'Order is missing a complete shipping address' });
    }

    const recipientName =
      (order.shipping_name || '').trim() ||
      `${order.first_name || ''} ${order.last_name || ''}`.trim() ||
      'Customer';

    // Fresh Shippo shipment at label time so carrier submission date is "now" (avoids UPS SubmissionDateTooOld on stale checkout shipments).
    const weightOz = await getTotalWeightOzForOrder(supabase, order);

    const shippoToken = process.env.SHIPPO_API_KEY!;
    const shippoRequest = {
      address_from: {
        name: 'SR Botanicals',
        street1: '2412 Ivy Stone Lane',
        city: 'Friendswood',
        state: 'TX',
        zip: '77546',
        country: 'US',
      },
      address_to: {
        name: recipientName,
        street1: street,
        city,
        state,
        zip,
        country: 'US',
      },
      parcels: [
        {
          length: '8.6875',
          width: '5.4375',
          height: '1.625',
          distance_unit: 'in',
          weight: `${weightOz}`,
          mass_unit: 'oz',
        },
      ],
      async: false,
    };

    const shipmentRes = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${shippoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shippoRequest),
    });

    const shipment = await shipmentRes.json();

    if (!shipmentRes.ok || shipment.error || !shipment.rates?.length) {
      console.error('❌ [MANUAL LABEL CREATION] Failed to create fresh Shippo shipment:', shipment);
      return res.status(400).json({
        error: 'Failed to create shipping shipment for label',
        details: shipment.messages || shipment.error || shipment,
      });
    }

    const rate = shipment.rates.find(
      (r: any) =>
        `${r.provider} ${r.servicelevel?.name || r.servicelevel}` === order.shipping_method
    );

    if (!rate) {
      return res.status(400).json({
        error: 'Matching shipping rate not found for this order. Rates may have changed; check available options.',
        availableRates: shipment.rates.map(
          (r: any) => `${r.provider} ${r.servicelevel?.name || r.servicelevel}`
        ),
      });
    }

    const shippo = new Shippo({ apiKeyHeader: shippoToken });

    const shipDate = new Date().toISOString().split('T')[0];
    console.log('🟢 [MANUAL LABEL CREATION] Creating Shippo transaction (fresh shipment):', {
      orderId,
      shipmentId: shipment.object_id,
      rateId: rate.object_id,
      rateService: rate.servicelevel?.name,
      rateProvider: rate.provider,
      shipDate,
      weightOz,
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

    // Update the order with label information (shipDate = day admin clicked Create label; shipment_id = fresh Shippo shipment)
    // First try with ship_date, if that fails (column doesn't exist), try without it
    let updateData: any = {
      shipment_id: shipment.object_id,
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
        shipment_id: shipment.object_id,
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
      shipmentId: shipment.object_id,
    });
  } catch (error: any) {
    console.error('🚨 Error creating shipping label:', error);
    return res.status(500).json({ 
      error: 'Failed to create shipping label',
      details: error.message 
    });
  }
}

