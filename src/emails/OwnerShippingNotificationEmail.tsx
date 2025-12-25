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
          <Heading style={styles.heading}>New Paid Shipping Order 📦</Heading>

          <Text style={styles.text}>
            A paid shipping order is ready to be fulfilled.
          </Text>

          <Text style={styles.text}>
            <strong>Order:</strong> #{orderId}
            <br />
            <strong>Customer:</strong> {customerName}
            <br />
            <strong>Email:</strong> {customerEmail}
            <br />
            <strong>Shipping Method:</strong> {shippingMethod}
          </Text>

          <Hr style={styles.hr} />

          <Section>
            <Heading as="h3" style={styles.subheading}>Items</Heading>

            {products.map((p, i) => (
              <Row key={i} style={styles.row}>
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

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Action needed: Pack and ship this order.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
