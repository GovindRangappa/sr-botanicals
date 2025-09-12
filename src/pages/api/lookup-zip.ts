// pages/api/lookup-zip.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { zip } = req.query;

  if (!zip) return res.status(400).json({ error: 'ZIP code required' });

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!response.ok) throw new Error('Invalid ZIP');

    const data = await response.json();
    const place = data.places?.[0];

    if (place) {
      res.status(200).json({ city: place['place name'], state: place['state abbreviation'] });
    } else {
      res.status(404).json({ error: 'No match found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup ZIP code' });
  }
}
