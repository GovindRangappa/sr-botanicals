import { Resend } from "resend";
import OwnerHandDeliveryNotificationEmail from "@/emails/OwnerHandDeliveryNotificationEmail";

type Product = { name: string; quantity: number; price: number };

type OrderForOwnerNotify = {
  id: string | number;
  first_name?: string | null;
  last_name?: string | null;
  customer_email?: string | null;
  phone?: string | null; // if you store it on orders; otherwise it can be absent
  products: Product[];
  subtotal?: number | null;
  tax?: number | null;
  shipping_cost?: number | null;
  total?: number | null;
  shipping_method: string;
};

export async function sendOwnerHandDeliveryNotificationEmail(order: OrderForOwnerNotify) {
  console.log("🚗 [Hand Delivery Email] Function called with order:", {
    id: order.id,
    shipping_method: order.shipping_method,
    customer_email: order.customer_email,
    first_name: order.first_name,
    last_name: order.last_name,
    phone: order.phone,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ [Hand Delivery Email] Missing RESEND_API_KEY");
    throw new Error("Missing RESEND_API_KEY");
  }

  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!to) {
    console.error("❌ [Hand Delivery Email] Missing OWNER_NOTIFICATION_EMAIL");
    throw new Error("Missing OWNER_NOTIFICATION_EMAIL");
  }

  console.log("📧 [Hand Delivery Email] Sending to:", to);

  const from = process.env.EMAIL_FROM || "SR Botanicals <orders@sr-botanicals.com>";

  const customerName = `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Customer";
  const customerEmail = order.customer_email ?? "—";

  const resend = new Resend(apiKey);

  const subject = `New Hand Delivery Order – #${order.id}`;

  console.log("📨 [Hand Delivery Email] Preparing email:", {
    from,
    to,
    subject,
    customerName,
    customerEmail,
    customerPhone: order.phone ?? null,
  });

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react: OwnerHandDeliveryNotificationEmail({
      orderId: order.id,
      customerName,
      customerEmail,
      customerPhone: order.phone ?? null,
      products: order.products ?? [],
      subtotal: order.subtotal ?? undefined,
      tax: order.tax ?? undefined,
      shippingCost: order.shipping_cost ?? undefined,
      total: order.total ?? undefined,
      shippingMethod: order.shipping_method,
    }),
  });

  if (error) {
    console.error("❌ [Hand Delivery Email] Resend error:", error);
    throw new Error(`Resend error: ${error.message}`);
  }

  console.log("✅ [Hand Delivery Email] Email sent successfully");
}

