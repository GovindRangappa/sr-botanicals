import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body;

    // 1️⃣ Verify inbound event type
    if (event.type !== 'email.received') {
      return res.status(200).json({ ignored: true });
    }

    const emailData = event.data;

    const fromEmail = emailData.from; // Example: 'John Doe <john@gmail.com>'
    const cleanEmail = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;

    const subject = emailData.subject || "";
    const textBody = emailData.text || "";
    const htmlBody = emailData.html || "";
    const message = textBody?.trim() || htmlBody?.trim() || "(No message)";

    // 🔥 DEBUG LOG
    console.log("🚀 INBOUND EMAIL RECEIVED:", {
    cleanEmail,
    subject,
    message
    });

    // 2️⃣ Lookup customer by email
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (customerError || !customer) {
      console.error("UNKNOWN EMAIL REPLY — cannot map to customer:", cleanEmail);
      return res.status(200).json({ stored: false, reason: "Unknown email" });
    }

    const customerId = customer.id;

    // 3️⃣ Insert into messages table
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        customer_id: customerId,
        sender: 'customer',
        message: message,
        type: 'text'
      });

    if (insertError) throw insertError;

    console.log("Inbound email saved for customer:", cleanEmail);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Resend Inbound Handler Error:", err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
