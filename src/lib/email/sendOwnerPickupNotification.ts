import { Resend } from "resend";
import OwnerPickupNotificationEmail from "@/emails/OwnerPickupNotificationEmail";

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

export async function sendOwnerPickupNotificationEmail(order: OrderForOwnerNotify) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!to) throw new Error("Missing OWNER_NOTIFICATION_EMAIL");

  const from = process.env.EMAIL_FROM || "SR Botanicals <orders@sr-botanicals.com>";

  const customerName = `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Customer";
  const customerEmail = order.customer_email ?? "—";

  const resend = new Resend(apiKey);

  const subject = `New Local Pickup Order – #${order.id}`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react: OwnerPickupNotificationEmail({
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
    throw new Error(`Resend error: ${error.message}`);
  }
}
