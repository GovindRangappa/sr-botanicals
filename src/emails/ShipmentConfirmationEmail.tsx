import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Link,
} from "@react-email/components";

type Props = {
  firstName?: string;
  orderId: string | number;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
};

export default function ShipmentConfirmationEmail({
  firstName,
  orderId,
  carrier,
  trackingNumber,
  trackingUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            Your order has shipped 📦
          </Heading>

          <Text style={styles.text}>
            Hi {firstName || "there"},
          </Text>

          <Text style={styles.text}>
            Your SR Botanicals order <strong>#{orderId}</strong> is on its way!
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            <strong>Carrier:</strong> {carrier}
            <br />
            <strong>Tracking Number:</strong> {trackingNumber}
          </Text>

          {trackingUrl && (
            <Text style={styles.text}>
              <Link href={trackingUrl} target="_blank" style={styles.link}>
                Track your package
              </Link>
            </Text>
          )}

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Tracking updates are provided directly by the carrier.
            <br />
            Thank you for supporting SR Botanicals 💚
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
  },
  heading: {
    color: "#2f5d50",
    marginBottom: "16px",
  },
  text: {
    fontSize: "14px",
    color: "#3c2f2f",
    lineHeight: "1.6",
  },
  link: {
    color: "#2f5d50",
    textDecoration: "underline",
  },
  footer: {
    fontSize: "13px",
    color: "#6b5e5e",
    textAlign: "center" as const,
  },
  hr: {
    margin: "24px 0",
    borderColor: "#e6e2d3",
  },
};
