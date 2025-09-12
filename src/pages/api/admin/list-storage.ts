// pages/api/admin/list-storage.ts

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER-ONLY KEY
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase.storage
    .from('product-images')
    .list('', { limit: 1000 });

  if (error) {
    console.error('❌ Error listing images:', error.message);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ images: data });
}
