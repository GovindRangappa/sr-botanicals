import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return; // Response already sent by requireAdmin

  const { customer_id } = req.query;
  if (!customer_id) return res.status(400).json({ error: 'Missing customer_id' });

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender, message, type, created_at')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ data });
  } catch (err) {
    console.error('Conversation Fetch Error:', err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
