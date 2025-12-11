import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // Verification GET request
  if (req.method === 'GET') {
    console.log("🔎 Resend verification GET received");
    return res.status(200).send("OK");
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const event = req.body;
    console.log("🔥 FULL EVENT PAYLOAD:", JSON.stringify(event, null, 2));

    if (event.type !== 'email.received') {
      return res.status(200).json({ ignored: true });
    }

    const emailData = event.data;

    console.log("📩 EMAIL DATA RAW:", JSON.stringify(emailData, null, 2));

    const fromEmail = emailData.from;
    const cleanEmail = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;

    const message =
      emailData.text ||
      emailData.html ||
      emailData.textAsHtml ||
      emailData.textAsMarkdown ||
      emailData.textAsMd ||
      "(No message)";

    console.log("🚀 INBOUND EMAIL RECEIVED:", {
      from: cleanEmail,
      subject: emailData.subject,
      parsedMessage: message
    });

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (!customer) {
      console.error("❌ Unknown email:", cleanEmail);
      return res.status(200).json({ stored: false });
    }

    await supabase.from('messages').insert({
      customer_id: customer.id,
      sender: 'customer',
      message,
      type: 'text'
    });

    console.log("✅ Saved inbound email for:", cleanEmail);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("🔥 Error:", err);
    return res.status(500).json({ error: 'Server Error' });
  }
}
