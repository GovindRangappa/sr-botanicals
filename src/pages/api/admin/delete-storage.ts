// pages/api/admin/delete-storage.ts

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return; // Response already sent by requireAdmin

  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  // Validate that all files are strings
  if (!files.every(file => typeof file === 'string')) {
    return res.status(400).json({ error: 'All files must be strings' });
  }

  const { error } = await supabase.storage.from('product-images').remove(files);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: 'Files deleted successfully' });
}
