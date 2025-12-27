import { resend } from "@/lib/resend";
import ShipmentConfirmationEmail from "@/emails/ShipmentConfirmationEmail";

export async function sendShipmentConfirmationEmail(order: any) {
  // Build shipping address object if available
  const shippingAddress = (order.shipping_street1 || order.shipping_city || order.shipping_state || order.shipping_zip)
    ? {
        name: order.shipping_name || undefined,
        street1: order.shipping_street1 || undefined,
        city: order.shipping_city || undefined,
        state: order.shipping_state || undefined,
        zip: order.shipping_zip || undefined,
      }
    : undefined;

  // Get estimated days (could be stored as estimated_days or shipping_estimated_days)
  const estimatedDays = order.shipping_estimated_days ?? order.estimated_days ?? null;

  return resend.emails.send({
    from: "SR Botanicals <orders@sr-botanicals.com>",
    to: order.customer_email,
    subject: "Your order has shipped 📦",
    react: ShipmentConfirmationEmail({
      firstName: order.customer_first_name || order.first_name,
      orderId: order.id,
      carrier: order.shipping_method,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url || undefined,
      shippingAddress,
      estimatedDays,
    }),
  });
}
