import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Resend verification ping
  if (req.method === "GET") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const event = req.body;

    if (!event || event.type !== "email.received") {
      return res.status(200).json({ ignored: true });
    }

    const { email_id, from, subject = "" } = event.data;

    const cleanEmail = from.match(/<(.+)>/)?.[1] || from;

    // 🔹 Fetch full email from Resend Receiving API
    const emailRes = await fetch(
      `https://api.resend.com/emails/receiving/${email_id}`,
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error("❌ Failed to fetch full email:", errorText);
      return res.status(200).json({ fetched: false });
    }

    const emailJson: any = await emailRes.json();

    // 🧠 Resend returns bodies under `body`
    let message =
      emailJson?.body?.text ||
      emailJson?.body?.html ||
      emailJson?.text ||
      emailJson?.html ||
      "";

    // Strip HTML if present
    if (typeof message === "string" && message.includes("<")) {
      message = message.replace(/<[^>]*>/g, "").trim();
    }

    if (!message || typeof message !== "string") {
      message = "(No message)";
    }

    console.log("📨 Inbound email parsed:", {
      from: cleanEmail,
      subject,
      message,
    });

    // 🔍 Lookup customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (customerError || !customer) {
      console.warn("⚠️ Unknown sender:", cleanEmail);
      return res.status(200).json({ stored: false });
    }

    // 💾 Store message
    const { error: insertError } = await supabase.from("messages").insert({
      customer_id: customer.id,
      sender: "customer",
      message,
      type: "text",
    });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("🔥 Resend inbound handler error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
