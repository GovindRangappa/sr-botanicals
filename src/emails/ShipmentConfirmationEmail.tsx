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

function getTrackingUrl(carrier: string, trackingNumber: string) {
  const normalized = carrier.toLowerCase();
  
  if (normalized.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
  
  if (normalized.includes("ups")) {
    return `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`;
  }
  
  if (normalized.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  
  // Fallback: Google it
  return `https://www.google.com/search?q=${encodeURIComponent(
    carrier + " tracking " + trackingNumber
  )}`;
}

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

          <Text style={styles.text}>
            <Link
              href={getTrackingUrl(carrier, trackingNumber)}
              target="_blank"
              style={styles.link}
            >
              Track your shipment
            </Link>
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Tracking updates are provided directly by the carrier using the link above.
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
