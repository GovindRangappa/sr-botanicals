import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Section,
  Row,
  Column,
} from "@react-email/components";

type Product = { name: string; quantity: number; price: number };

type OwnerHandDeliveryNotificationEmailProps = {
  orderId: string | number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  products: Product[];
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  total?: number;
  shippingMethod: string; // should be "Hand Delivery"
};

export default function OwnerHandDeliveryNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  products,
  subtotal,
  tax,
  shippingCost,
  total,
  shippingMethod,
}: OwnerHandDeliveryNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New Hand Delivery Order 🚗</Heading>

          <Text style={styles.text}>
            A customer placed a <strong>{shippingMethod}</strong> order.
          </Text>

          <Text style={styles.text}>
            <strong>Order:</strong> #{orderId}
            <br />
            <strong>Customer:</strong> {customerName}
            <br />
            <strong>Email:</strong> {customerEmail}
            <br />
            <strong>Phone:</strong> {customerPhone || "—"}
          </Text>

          <Hr style={styles.hr} />

          <Section>
            <Heading as="h3" style={styles.subheading}>
              Items
            </Heading>

            {products.map((p, idx) => (
              <Row key={idx} style={styles.row}>
                <Column>
                  <Text style={styles.itemText}>
                    {p.quantity} × {p.name}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={styles.itemText}>
                    ${(p.price * p.quantity).toFixed(2)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          {(subtotal != null || tax != null || shippingCost != null || total != null) && (
            <>
              <Hr style={styles.hr} />
              <Section>
                <Heading as="h3" style={styles.subheading}>
                  Totals
                </Heading>

                {subtotal != null && (
                  <Row style={styles.row}>
                    <Column>
                      <Text style={styles.text}>Subtotal</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.text}>${subtotal.toFixed(2)}</Text>
                    </Column>
                  </Row>
                )}

                {tax != null && (
                  <Row style={styles.row}>
                    <Column>
                      <Text style={styles.text}>Tax</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.text}>${tax.toFixed(2)}</Text>
                    </Column>
                  </Row>
                )}

                {shippingCost != null && (
                  <Row style={styles.row}>
                    <Column>
                      <Text style={styles.text}>Shipping</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.text}>${shippingCost.toFixed(2)}</Text>
                    </Column>
                  </Row>
                )}

                {total != null && (
                  <Row style={styles.row}>
                    <Column>
                      <Text style={styles.totalText}>Total</Text>
                    </Column>
                    <Column align="right">
                      <Text style={styles.totalText}>${total.toFixed(2)}</Text>
                    </Column>
                  </Row>
                )}
              </Section>
            </>
          )}

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Action needed: Please reach out to the customer to coordinate hand delivery.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#f5f2e8", fontFamily: "Georgia, serif" },
  container: {
    backgroundColor: "#ffffff",
    padding: "28px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  heading: { color: "#2f5d50", marginBottom: "12px" },
  subheading: { color: "#3c2f2f", marginBottom: "10px" },
  text: { color: "#3c2f2f", fontSize: "14px", lineHeight: "1.6" },
  itemText: { fontSize: "14px", color: "#3c2f2f" },
  totalText: { fontSize: "16px", fontWeight: "bold", color: "#2f5d50" },
  row: { marginBottom: "8px" },
  hr: { margin: "20px 0", borderColor: "#e6e2d3" },
  footer: {
    fontSize: "13px",
    color: "#6b5e5e",
    textAlign: "center" as const,
    lineHeight: "1.6",
  },
};

