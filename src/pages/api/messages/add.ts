import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { first_name, last_name, email, message, sender = 'customer', type = 'text' } = req.body;
  if (!first_name || !last_name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1️⃣ Check if customer exists by email
    const { data: existingCustomer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      // Ignore "Row not found" error
      throw customerError;
    }

    let customerId = existingCustomer?.id;

    // 2️⃣ If not exists, insert customer
    if (!customerId) {
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{ first_name, last_name, email }])
        .select()
        .single();

      if (insertError) throw insertError;
      customerId = newCustomer.id;
    }

    // 3️⃣ Insert the message linked to customer
    const { error: messageError } = await supabase.from('messages').insert([{
      customer_id: customerId,
      sender,
      message,
      type
    }]);

    if (messageError) throw messageError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
