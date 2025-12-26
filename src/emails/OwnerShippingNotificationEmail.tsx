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

type Product = {
  name: string;
  quantity: number;
  price: number;
};

type Props = {
  orderId: string | number;
  customerName: string;
  customerEmail: string;
  products: Product[];
  shippingMethod: string;
};

export default function OwnerShippingNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  products,
  shippingMethod,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            New Paid Shipping Order 📦
          </Heading>

          <Text style={styles.text}>
            A paid shipping order has been placed and is ready to be fulfilled.
          </Text>

          <Text style={styles.text}>
            <strong>Order ID:</strong> #{orderId}
            <br />
            <strong>Customer:</strong> {customerName}
            <br />
            <strong>Email:</strong> {customerEmail}
            <br />
            <strong>Shipping Method:</strong> {shippingMethod}
          </Text>

          <Hr style={styles.hr} />

          <Section>
            <Heading as="h3" style={styles.subheading}>
              Order Items
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

          <Text style={styles.footer}>
            Action required: Please pack and ship this order.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/* =========================
   Styles
   ========================= */

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
  row: {
    marginBottom: "8px",
  },
  hr: {
    margin: "24px 0",
    borderColor: "#e6e2d3",
  },
  footer: {
    fontSize: "13px",
    color: "#6b5e5e",
    marginTop: "24px",
  },
};
