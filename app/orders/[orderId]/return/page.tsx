
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Orders - [orderId] - Return | Kaari',
  description: 'Orders - [orderId] - Return page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Orders - [orderId] - Return | Kaari',
    description: 'Orders - [orderId] - Return page for Kaari Handmade Crochet.',
  },
};

import ReturnPortalPage from './OrdersorderIdReturnClient';

export default function OrdersorderIdReturnPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <ReturnPortalPage params={params} />;
}
