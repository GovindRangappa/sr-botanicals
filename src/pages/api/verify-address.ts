// pages/api/verify-address.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
  if (req.method !== 'POST' || !SHIPPO_API_KEY) {
    return res.status(400).json({ error: 'Bad request or missing API key' });
  }

  try {
    const { firstName, lastName, street, city, state, zip } = req.body;

    // Optional: combine first/last name for Shippo label
    const name = `${firstName} ${lastName}`.trim();

    const response = await fetch('https://api.goshippo.com/addresses/', {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        street1: street,
        city,
        state,
        zip,
        country: 'US',
        validate: true,
      }),
    });

    const data = await response.json();

    if (data.validation_results?.is_valid) {
      return res.status(200).json({ valid: true, data });
    } else {
      return res.status(200).json({
        valid: false,
        messages: data.validation_results?.messages || ['Address could not be verified'],
      });
    }
  } catch (err) {
    console.error('❌ Shippo verification error:', err);
    return res.status(500).json({ error: 'Address verification failed' });
  }
}
