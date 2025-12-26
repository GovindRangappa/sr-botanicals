import { resend } from "@/lib/resend";
import ShipmentConfirmationEmail from "@/emails/ShipmentConfirmationEmail";

export async function sendShipmentConfirmationEmail(order: any) {
  return resend.emails.send({
    from: "SR Botanicals <orders@sr-botanicals.com>",
    to: order.customer_email,
    subject: "Your order has shipped 📦",
    react: ShipmentConfirmationEmail({
      firstName: order.customer_first_name,
      orderId: order.id,
      carrier: order.shipping_method,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url || undefined,
    }),
  });
}
