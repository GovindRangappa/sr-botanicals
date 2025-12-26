// emails/OrderConfirmationEmail.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Hr,
  Section,
  Row,
  Column,
  Link,
} from "@react-email/components";

type Product = {
  name: string;
  quantity: number;
  price: number;
};

interface OrderConfirmationEmailProps {
  orderId: string | number;
  firstName?: string;
  products: Product[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
  receiptUrl?: string | null;
}


function getFulfillmentMessage(shippingMethod: string) {
  // Normalize shipping method for comparison
  const normalized = shippingMethod?.trim() || "";
  const isLocalPickup = normalized === "Local Pickup";
  const isHandDelivery = normalized === "Hand Delivery";

  if (isLocalPickup) {
    return "We'll reach out shortly to coordinate a pickup time.";
  }

  if (isHandDelivery) {
    return "Your order has been fulfilled. Thank you for supporting SR Botanicals 💚";
  }

  // Default for paid shipping
  return "We'll notify you once your order ships and provide tracking information.";
}


function getOrderStatusIntro(
  shippingMethod: string,
  orderId: string | number
) {
  // Normalize shipping method for comparison
  const normalized = shippingMethod?.trim() || "";
  const isLocalPickup = normalized === "Local Pickup";
  const isHandDelivery = normalized === "Hand Delivery";

  if (isLocalPickup) {
    return `We've received your order #${orderId} and are preparing it for pickup.`;
  }

  if (isHandDelivery) {
    return `Your order #${orderId} has been completed. Thank you for shopping with SR Botanicals.`;
  }

  // Default for paid shipping
  return `We've received your order #${orderId} and are getting it ready for shipment.`;
}




export default function OrderConfirmationEmail({
  orderId,
  firstName,
  products,
  subtotal,
  tax,
  shippingCost,
  total,
  shippingMethod,
  receiptUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            Thank you for your order 🌿
          </Heading>

          <Text style={styles.text}>
            Hi {firstName || "there"},
          </Text>

          <Text style={styles.text}>
            {getOrderStatusIntro(shippingMethod, orderId)}
          </Text>


          <Hr style={styles.hr} />

          {/* Order Items */}
          <Section>
            <Heading as="h3" style={styles.subheading}>
              Order Summary
            </Heading>

            {products.map((product, index) => (
              <Row key={index} style={styles.row}>
                <Column>
                  <Text style={styles.itemText}>
                    {product.quantity} × {product.name}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={styles.itemText}>
                    ${(product.price * product.quantity).toFixed(2)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={styles.hr} />

          {/* Totals */}
          <Section>
            <Row style={styles.row}>
              <Column>
                <Text style={styles.text}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={styles.text}>${subtotal.toFixed(2)}</Text>
              </Column>
            </Row>

            <Row style={styles.row}>
              <Column>
                <Text style={styles.text}>Sales Tax</Text>
              </Column>
              <Column align="right">
                <Text style={styles.text}>${tax.toFixed(2)}</Text>
              </Column>
            </Row>

            <Row style={styles.row}>
              <Column>
                <Text style={styles.text}>Shipping</Text>
              </Column>
              <Column align="right">
                <Text style={styles.text}>${shippingCost.toFixed(2)}</Text>
              </Column>
            </Row>

            <Row style={styles.row}>
              <Column>
                <Text style={styles.totalText}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={styles.totalText}>${total.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={styles.hr} />

          {/* Shipping Method */}
          <Text style={styles.text}>
            <strong>Fulfillment Method:</strong> {shippingMethod}
          </Text>

          {/* Receipt Link */}
          {receiptUrl && (
            <Text style={styles.text}>
              <Link href={receiptUrl} style={styles.link} target="_blank">
                View your Stripe receipt
              </Link>
            </Text>
          )}

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            {getFulfillmentMessage(shippingMethod)}
          </Text>

        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f5f2e8",
    fontFamily: "Georgia, serif",
  },
  container: {
    backgroundColor: "#ffffff",
    padding: "32px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  heading: {
    color: "#2f5d50",
    marginBottom: "16px",
  },
  subheading: {
    color: "#3c2f2f",
    marginBottom: "12px",
  },
  text: {
    color: "#3c2f2f",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  itemText: {
    fontSize: "14px",
    color: "#3c2f2f",
  },
  totalText: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#2f5d50",
  },
  row: {
    marginBottom: "8px",
  },
  hr: {
    margin: "24px 0",
    borderColor: "#e6e2d3",
  },
  link: {
    color: "#2f5d50",
    textDecoration: "underline",
  },
  footer: {
    fontSize: "13px",
    color: "#6b5e5e",
    textAlign: "center" as const,
    lineHeight: "1.6",
  },
};
