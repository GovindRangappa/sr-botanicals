import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { customerId, message } = req.body;
  if (!customerId || !message) return res.status(400).json({ error: 'Missing fields' });

  try {
    // 1️⃣ Insert reply into messages table
    const { error: insertError } = await supabase
      .from('messages')
      .insert([{ customer_id: customerId, sender: 'business', message, type: 'text' }]);

    if (insertError) throw insertError;

    // 2️⃣ Get customer email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('email, first_name')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // 3️⃣ Send email via Resend
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: customer.email,
      subject: `Reply from SR Botanicals`,
      html: `
        <p>Hi ${customer.first_name},</p>
        <p>${message}</p>
        <p>— SR Botanicals Team</p>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
