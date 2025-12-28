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
  Link,
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
  customerPhone?: string | null;
  products: Product[];
  shippingMethod: string;
  shippingAddress?: {
    name?: string | null;
    street1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  labelUrl?: string | null;
  packingSlipUrl?: string | null;
};

export default function OwnerShippingNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  products,
  shippingMethod,
  shippingAddress,
  labelUrl,
  packingSlipUrl,
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
            <strong>Shipping Method:</strong> {shippingMethod}
          </Text>

          <Hr style={styles.hr} />

          {shippingAddress && (shippingAddress.street1 || shippingAddress.city || shippingAddress.state || shippingAddress.zip) && (
            <>
              <Heading as="h3" style={styles.subheading}>
                Shipping Address
              </Heading>
              <Text style={styles.text}>
                {shippingAddress.name && <>{shippingAddress.name}<br /></>}
                {shippingAddress.street1 && <>{shippingAddress.street1}<br /></>}
                {shippingAddress.city && shippingAddress.state && shippingAddress.zip && (
                  <>
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                  </>
                )}
              </Text>
              <Hr style={styles.hr} />
            </>
          )}

          <Heading as="h3" style={styles.subheading}>
            Contact Information
          </Heading>
          <Text style={styles.text}>
            <strong>Email:</strong> {customerEmail}
            {customerPhone && (
              <>
                <br />
                <strong>Phone:</strong> {customerPhone}
              </>
            )}
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

          {(labelUrl || packingSlipUrl) && (
            <>
              <Heading as="h3" style={styles.subheading}>
                Shipping Documents
              </Heading>
              <Text style={styles.text}>
                {labelUrl && (
                  <>
                    <Link href={labelUrl} style={styles.link} target="_blank">
                      Download Shipping Label
                    </Link>
                    <br />
                  </>
                )}
                {packingSlipUrl && (
                  <>
                    <Link href={packingSlipUrl} style={styles.link} target="_blank">
                      Download Packing Slip
                    </Link>
                  </>
                )}
              </Text>
              <Hr style={styles.hr} />
            </>
          )}

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
  link: {
    color: "#2f5d50",
    textDecoration: "underline",
  },
};
