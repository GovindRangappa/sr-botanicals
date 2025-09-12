// pages/api/admin/delete-image.ts
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // only used server-side
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageUrl } = req.body;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Invalid image URL' });
  }

  try {
    const fileName = imageUrl.split('/').pop()?.split('?')[0];
    if (!fileName) throw new Error('Could not extract file name from URL');

    const { error } = await supabase.storage.from('product-images').remove([fileName]);
    if (error) throw error;

    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
