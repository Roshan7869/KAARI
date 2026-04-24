
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Payment failed | Kaari',
  description: 'Payment failed page for Kaari Handmade Crochet.',
  
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Payment failed | Kaari',
    description: 'Payment failed page for Kaari Handmade Crochet.',
  },
};

import PaymentFailedPage from './PaymentfailedClient';

export default function PaymentfailedPage() {
  return <PaymentFailedPage />;
}
