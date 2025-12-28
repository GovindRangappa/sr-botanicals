import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Require admin authentication
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return; // Response already sent by requireAdmin

  const { customerId, message } = req.body;
  if (!customerId || typeof customerId !== 'number' || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  // Sanitize message to prevent XSS
  const sanitizedMessage = sanitizeHtml(message.trim());
  if (!sanitizedMessage) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    // 1️⃣ Insert reply into messages table
    const { error: insertError } = await supabase
      .from('messages')
      .insert([{ customer_id: customerId, sender: 'business', message: sanitizedMessage, type: 'text' }]);

    if (insertError) throw insertError;

    // 2️⃣ Get customer email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('email, first_name')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Sanitize customer name for email
    const sanitizedFirstName = sanitizeHtml(customer.first_name || 'there');

    // 3️⃣ Send email via Resend
    await resend.emails.send({
      from: 'support@sr-botanicals.com',
      reply_to: 'support@sr-botanicals.com',
      to: customer.email,
      subject: `Reply from SR Botanicals`,
      html: `
        <p>Hi ${sanitizedFirstName},</p>
        <p>${sanitizedMessage.replace(/\n/g, '<br/>')}</p>
        <p>— SR Botanicals Team</p>
      `
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
