import { Resend } from "resend";
import OwnerShippingNotificationEmail from "@/emails/OwnerShippingNotificationEmail";

export async function sendOwnerShippingNotificationEmail(order: any, baseUrl?: string) {
  console.log("📧 [sendOwnerShippingNotificationEmail] Starting...", {
    orderId: order.id,
    shipping_method: order.shipping_method,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ [sendOwnerShippingNotificationEmail] Missing RESEND_API_KEY");
    throw new Error("Missing RESEND_API_KEY");
  }

  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!to) {
    console.error("❌ [sendOwnerShippingNotificationEmail] Missing OWNER_NOTIFICATION_EMAIL");
    throw new Error("Missing OWNER_NOTIFICATION_EMAIL");
  }

  const resend = new Resend(apiKey);

  const customerName =
    `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Customer";

  // Construct packing slip URL
  // Try to use provided baseUrl, then environment variable, then default
  let appUrl = baseUrl;
  if (!appUrl) {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      appUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      appUrl = 'https://sr-botanicals.vercel.app';
    }
  }
  const packingSlipUrl = `${appUrl}/api/generate-packing-slip?orderId=${order.id}`;

  console.log("📨 [sendOwnerShippingNotificationEmail] Sending email:", {
    to,
    orderId: order.id,
    packingSlipUrl,
  });

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `New Paid Shipping Order – #${order.id}`,
    react: OwnerShippingNotificationEmail({
      orderId: order.id,
      customerName,
      customerEmail: order.customer_email,
      customerPhone: order.phone || order.customer_phone || null,
      products: order.products,
      shippingMethod: order.shipping_method,
      shippingAddress: {
        name: order.shipping_name || null,
        street1: order.shipping_street1 || null,
        city: order.shipping_city || null,
        state: order.shipping_state || null,
        zip: order.shipping_zip || null,
      },
      packingSlipUrl,
    }),
  });

  if (error) {
    console.error("❌ [sendOwnerShippingNotificationEmail] Resend error:", error);
    throw new Error(`Resend error: ${error.message}`);
  }

  console.log("✅ [sendOwnerShippingNotificationEmail] Email sent successfully:", data);
}
