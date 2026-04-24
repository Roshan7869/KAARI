
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Settings - Payment | Kaari',
  description: 'Admin - Settings - Payment page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Settings - Payment | Kaari',
    description: 'Admin - Settings - Payment page for Kaari Handmade Crochet.',
  },
};

import PaymentGatewaySettings from './AdminSettingsPaymentClient';

export default function AdminSettingsPaymentPage() {
  return <PaymentGatewaySettings />;
}
