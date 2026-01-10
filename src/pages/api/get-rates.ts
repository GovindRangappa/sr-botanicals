// pages/api/get-rates.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, weightOz } = req.body;

  if (!address || !address.street || !address.city || !address.state || !address.zip || !weightOz) {
    console.error('❌ Missing required fields:', { address, weightOz });
    return res.status(400).json({ error: 'Missing required address or weight fields' });
  }

  const shippoToken = process.env.SHIPPO_API_KEY;
  if (!shippoToken) {
    return res.status(500).json({ error: 'Missing SHIPPO_API_KEY' });
  }

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
      name: address.name || (address.firstName && address.lastName 
        ? `${address.firstName} ${address.lastName}`.trim()
        : 'Customer'),
      street1: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
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

  try {
    const response = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${shippoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shippoRequest),
    });

    const shipment = await response.json();

    // Check if Shippo returned an error
    if (!response.ok || shipment.error || !shipment.rates) {
      console.error('❌ Shippo API error response:', shipment);
      return res.status(500).json({ error: 'Failed to fetch shipping rates from Shippo', details: shipment });
    }
    let rates = shipment.rates || [];

    // Filter out extremely expensive or redundant options
    const seen = new Set();
    rates = rates
      .filter((rate: any) => {
        const key = `${rate.provider}-${rate.servicelevel?.name}`;
        const price = parseFloat(rate.amount);
        if (seen.has(key) || price > 25) return false;
        seen.add(key);
        return true;
      })
      .map((rate: any) => ({
        id: rate.object_id,
        amount: rate.amount,
        provider: rate.provider,
        servicelevel: rate.servicelevel?.name || '',
        estimated_days: rate.estimated_days,
        currency: rate.currency,
      }));

    // Sort to find best non-zero rate
    const paidOnly = rates.filter(r => parseFloat(r.amount) > 0);
    const bestValue = paidOnly.length > 0 ? paidOnly.reduce((min, curr) => {
      return parseFloat(curr.amount) < parseFloat(min.amount) ? curr : min;
    }, paidOnly[0]) : null;

    // Append custom free delivery options
    rates.push(
      {
        id: 'local-pickup',
        amount: '0.00',
        provider: 'Local Pickup',
        servicelevel: 'Pickup from 2412 Ivy Stone Ln',
        estimated_days: null,
        currency: 'USD',
      },
      {
        id: 'hand-delivery',
        amount: '0.00',
        provider: 'In Person',
        servicelevel: 'Hand Delivered by SR Botanicals',
        estimated_days: null,
        currency: 'USD',
      }
    );



    if (!shipment.object_id) {
      console.error('❌ Shipment object_id missing from Shippo response');
      return res.status(500).json({ error: 'Failed to create shipment' });
    }



    return res.status(200).json({
      rates,
      shipmentId: shipment.object_id,
      bestValueId: bestValue?.id || null,
    });
  } catch (error) {
    console.error('🚨 Shippo API error:', error);
    return res.status(500).json({ error: 'Failed to fetch shipping rates' });
  }
}
