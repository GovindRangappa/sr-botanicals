import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET for verification
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const event = req.body;

    if (event.type !== "email.received") {
      return res.status(200).json({ ignored: true });
    }

    const emailId = event.data.email_id;
    const from = event.data.from;
    const subject = event.data.subject || "";

    const cleanEmail = from.match(/<(.+)>/)?.[1] || from;

    // 🔹 Fetch full email content from Resend
    const emailRes = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}`,
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      }
    );

    const emailJson: any = await emailRes.json();

    // Try all possible body locations
    let message =
      emailJson.text ||
      emailJson.html ||
      emailJson.text_as_html ||
      emailJson.stripped_text ||
      emailJson.stripped_html ||
      "";

    // Strip HTML if needed
    if (message && message.includes("<")) {
      message = message.replace(/<[^>]*>/g, "").trim();
    }

    if (!message) {
      message = "(No message)";
    }

    console.log("📨 Parsed inbound email:", {
      from: cleanEmail,
      subject,
      message,
    });

    // Lookup customer
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (!customer) {
      console.warn("Unknown sender:", cleanEmail);
      return res.status(200).json({ stored: false });
    }

    // Store message
    await supabase.from("messages").insert({
      customer_id: customer.id,
      sender: "customer",
      message,
      type: "text",
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Inbound email error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
