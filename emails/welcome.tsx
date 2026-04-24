import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Button } from '@react-email/components';

interface WelcomeEmailProps {
  customerName: string;
  shopUrl: string;
}

export default function WelcomeEmail({ customerName, shopUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Kaari — where every stitch tells a story</Preview>
      <Body style={{ backgroundColor: '#fdf8f3', fontFamily: 'Georgia, serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#fff', padding: 40, borderRadius: 8 }}>
          <Heading style={{ color: '#2d1b0e', fontSize: 32, marginBottom: 8 }}>Welcome to Kaari</Heading>
          <Text style={{ color: '#555', lineHeight: 1.6, fontSize: 16 }}>
            Hi {customerName},
          </Text>
          <Text style={{ color: '#555', lineHeight: 1.6 }}>
            We&apos;re so glad you&apos;re here! Kaari is a marketplace for handmade crochet products crafted by skilled Indian artisans. Each piece is made with love, care, and attention to detail.
          </Text>
          <Section style={{ backgroundColor: '#fdf8f3', padding: 24, borderRadius: 6, margin: '20px 0', textAlign: 'center' }}>
            <Text style={{ color: '#8b4513', fontSize: 18, fontWeight: 'bold', margin: 0 }}>
              Discover unique, handcrafted pieces made just for you.
            </Text>
          </Section>
          <Button href={shopUrl} style={{ backgroundColor: '#8b4513', color: '#fff', padding: '14px 28px', borderRadius: 6, textDecoration: 'none', display: 'inline-block', marginTop: 16, fontSize: 16 }}>
            Shop Now
          </Button>
          <Hr style={{ borderColor: '#e8ddd4', margin: '24px 0 16px' }} />
          <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>Kaari — Handmade with love in India</Text>
        </Container>
      </Body>
    </Html>
  );
}