import { Resend } from "resend";
import OwnerShippingNotificationEmail from "@/emails/OwnerShippingNotificationEmail";

export async function sendOwnerShippingNotificationEmail(order: any) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const customerName =
    `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Customer";

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.OWNER_NOTIFICATION_EMAIL!,
    subject: `New Paid Shipping Order – #${order.id}`,
    react: OwnerShippingNotificationEmail({
      orderId: order.id,
      customerName,
      customerEmail: order.customer_email,
      products: order.products,
      shippingMethod: order.shipping_method,
    }),
  });
}
