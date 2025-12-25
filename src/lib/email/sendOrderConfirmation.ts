// lib/email/sendOrderConfirmation.ts
import { Resend } from "resend";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendOrderConfirmationEmail(order: any) {
  if (!order?.customer_email) {
    console.warn("⚠️ No customer email found for order:", order?.id);
    return;
  }

  try {
    await resend.emails.send({
      from: "SR Botanicals <orders@sr-botanicals.com>",
      to: order.customer_email,
      subject: `Order Confirmed 🌿 – #${order.id}`,
      react: OrderConfirmationEmail({
        orderId: order.id,
        firstName: order.first_name,
        products: order.products,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shipping_cost,
        total:
          Number(order.subtotal || 0) +
          Number(order.tax || 0) +
          Number(order.shipping_cost || 0),
        shippingMethod: order.shipping_method,
        receiptUrl: order.stripe_receipt_url,
      }),
    });
  } catch (err) {
    console.error("❌ Failed to send order confirmation email:", err);
    throw err;
  }
}
