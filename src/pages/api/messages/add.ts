import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { first_name, last_name, email, phone, message, sender = 'customer', type = 'text' } = req.body;
  
  // Validate inputs
  if (!first_name || typeof first_name !== 'string' ||
      !last_name || typeof last_name !== 'string' ||
      !email || typeof email !== 'string' ||
      !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  // Sanitize inputs
  const sanitizedFirstName = sanitizeHtml(first_name.trim());
  const sanitizedLastName = sanitizeHtml(last_name.trim());
  const sanitizedEmail = email.trim().toLowerCase(); // Email doesn't need HTML sanitization, but validate format
  const sanitizedMessage = sanitizeHtml(message.trim());
  const sanitizedPhone = phone ? phone.trim() : null;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate sender value
  if (sender !== 'customer' && sender !== 'business') {
    return res.status(400).json({ error: 'Invalid sender value' });
  }

  try {
    // 1️⃣ Check if customer exists by email
    const { data: existingCustomer, error: customerError } = await supabase
      .from('customers')
      .select('id, phone')
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
        .insert([{ first_name: sanitizedFirstName, last_name: sanitizedLastName, email: sanitizedEmail, phone: sanitizedPhone }])
        .select()
        .single();

      if (insertError) throw insertError;
      customerId = newCustomer.id;
    } else if (sanitizedPhone && !existingCustomer.phone) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ phone: sanitizedPhone })
        .eq('id', existingCustomer.id);

      if (updateError) throw updateError;
    }

    // 3️⃣ Insert the message linked to customer
    const { error: messageError } = await supabase.from('messages').insert([{
      customer_id: customerId,
      sender,
      message: sanitizedMessage,
      type
    }]);

    if (messageError) throw messageError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
