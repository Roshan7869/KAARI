
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Payment | Kaari',
  description: 'Payment page for Kaari Handmade Crochet.',
  
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Payment | Kaari',
    description: 'Payment page for Kaari Handmade Crochet.',
  },
};

import PaymentPageInner from './PaymentClient';

export default function PaymentPage() {
  return <PaymentPageInner />;
}
