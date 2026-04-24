import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Row, Column, Button } from '@react-email/components';

interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  items: Array<{ name: string; qty: number; price: string }>;
  shippingAddress: string;
  trackUrl: string;
}

export default function OrderConfirmationEmail({
  customerName,
  orderNumber,
  orderTotal,
  items,
  shippingAddress,
  trackUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Kaari order #{orderNumber} is confirmed!</Preview>
      <Body style={{ backgroundColor: '#fdf8f3', fontFamily: 'Georgia, serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 40, borderRadius: 8 }}>
          <Heading style={{ color: '#2d1b0e', fontSize: 28, marginBottom: 8 }}>Order Confirmed</Heading>
          <Text style={{ color: '#555', lineHeight: 1.6 }}>
            Hi {customerName}, your handmade crochet piece is being lovingly crafted just for you.
          </Text>
          <Section style={{ backgroundColor: '#fdf8f3', padding: 20, borderRadius: 6, margin: '20px 0' }}>
            <Text style={{ margin: 0, fontWeight: 'bold', color: '#2d1b0e' }}>
              Order #{orderNumber} &bull; Total: {orderTotal}
            </Text>
          </Section>
          {items.map((item, i) => (
            <Row key={i} style={{ borderBottom: '1px solid #e8ddd4', padding: '10px 0' }}>
              <Column>
                <Text style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</Text>
                <Text style={{ margin: 0, color: '#888', fontSize: 13 }}>Qty {item.qty} &times; {item.price}</Text>
              </Column>
            </Row>
          ))}
          <Hr style={{ borderColor: '#e8ddd4', margin: '20px 0' }} />
          <Text style={{ color: '#555', fontSize: 13 }}>Shipping to: {shippingAddress}</Text>
          <Button href={trackUrl} style={{ backgroundColor: '#8b4513', color: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            Track Your Order
          </Button>
          <Hr style={{ borderColor: '#e8ddd4', margin: '24px 0 16px' }} />
          <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>Kaari — Handmade with love in India</Text>
        </Container>
      </Body>
    </Html>
  );
}