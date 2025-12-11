import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // 1️⃣ Resend webhook verification (GET request)
  if (req.method === 'GET') {
    console.log("🔎 Resend verification GET received");
    return res.status(200).send("OK");
  }

  // 2️⃣ Only allow POST for inbound events
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const event = req.body;
    console.log("🔥 FULL EVENT PAYLOAD:", JSON.stringify(event, null, 2));

    // Ignore non-email events
    if (event.type !== "email.received") {
      return res.status(200).json({ ignored: true });
    }

    const emailData = event.data;

    // Extract clean customer email
    const fromEmail = emailData.from;
    const cleanEmail = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;

    // Extract message from all possible fields
    let message =
      emailData.text ||
      emailData.html ||
      emailData.text_as_html ||
      emailData.stripped_text ||
      emailData.stripped_html ||
      emailData.html_body ||
      emailData.raw || // raw MIME (Gmail often sends replies here)
      "";

    // Convert HTML to plain text fallback
    if (!message && emailData.html) {
      message = emailData.html.replace(/<[^>]+>/g, "").trim();
    }

    // Final fallback
    if (!message || typeof message !== "string") {
      message = "(No message)";
    } else {
      message = message.trim();
    }

    console.log("🚀 INBOUND EMAIL RECEIVED (parsed):", {
      from: cleanEmail,
      subject: emailData.subject || "",
      parsedMessage: message
    });

    // 3️⃣ Look up customer in Supabase
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (customerError || !customer) {
      console.error("❌ Unknown customer email replying:", cleanEmail);
      return res.status(200).json({ stored: false, reason: "Unknown email" });
    }

    // 4️⃣ Insert message into conversation
    const { error: insertError } = await supabase
      .from("messages")
      .insert({
        customer_id: customer.id,
        sender: "customer",
        message: message,
        type: "text"
      });

    if (insertError) throw insertError;

    console.log("✅ Saved inbound email for:", cleanEmail);

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("🔥 Resend Inbound Handler Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
