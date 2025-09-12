import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { data, error } = await supabase.rpc('get_inbox_messages');

    if (error) {
      console.error('Supabase RPC Error:', error);
      return res.status(500).json({ error: 'Failed to fetch inbox messages' });
    }

    return res.status(200).json({ data });

  } catch (err) {
    console.error('API Handler Error:', err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
