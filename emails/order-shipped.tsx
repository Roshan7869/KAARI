import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Row, Column, Button } from '@react-email/components';

interface OrderShippedEmailProps {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  courierName: string;
  trackUrl: string;
  estimatedDelivery: string;
}

export default function OrderShippedEmail({
  customerName,
  orderNumber,
  trackingNumber,
  courierName,
  trackUrl,
  estimatedDelivery,
}: OrderShippedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Kaari order #{orderNumber} is on its way!</Preview>
      <Body style={{ backgroundColor: '#fdf8f3', fontFamily: 'Georgia, serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 40, borderRadius: 8 }}>
          <Heading style={{ color: '#2d1b0e', fontSize: 28, marginBottom: 8 }}>Your Order is on Its Way!</Heading>
          <Text style={{ color: '#555', lineHeight: 1.6 }}>
            Hi {customerName}, great news — your handmade crochet order has been shipped!
          </Text>
          <Section style={{ backgroundColor: '#fdf8f3', padding: 20, borderRadius: 6, margin: '20px 0' }}>
            <Row>
              <Column style={{ width: '50%' }}>
                <Text style={{ margin: 0, color: '#8b7355', fontSize: 13 }}>Order Number</Text>
                <Text style={{ margin: 0, fontWeight: 'bold', color: '#2d1b0e' }}>#{orderNumber}</Text>
              </Column>
              <Column style={{ width: '50%' }}>
                <Text style={{ margin: 0, color: '#8b7355', fontSize: 13 }}>Courier</Text>
                <Text style={{ margin: 0, fontWeight: 'bold', color: '#2d1b0e' }}>{courierName}</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: 12 }}>
              <Column style={{ width: '50%' }}>
                <Text style={{ margin: 0, color: '#8b7355', fontSize: 13 }}>Tracking Number</Text>
                <Text style={{ margin: 0, fontWeight: 'bold', color: '#2d1b0e' }}>{trackingNumber}</Text>
              </Column>
              <Column style={{ width: '50%' }}>
                <Text style={{ margin: 0, color: '#8b7355', fontSize: 13 }}>Estimated Delivery</Text>
                <Text style={{ margin: 0, fontWeight: 'bold', color: '#2d1b0e' }}>{estimatedDelivery}</Text>
              </Column>
            </Row>
          </Section>
          <Button href={trackUrl} style={{ backgroundColor: '#8b4513', color: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            Track Your Package
          </Button>
          <Hr style={{ borderColor: '#e8ddd4', margin: '24px 0 16px' }} />
          <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>Kaari — Handmade with love in India</Text>
        </Container>
      </Body>
    </Html>
  );
}