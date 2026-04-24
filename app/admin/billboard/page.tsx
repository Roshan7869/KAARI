
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Billboard | Kaari',
  description: 'Admin - Billboard page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Billboard | Kaari',
    description: 'Admin - Billboard page for Kaari Handmade Crochet.',
  },
};

import AdminBillboardClient from './AdminBillboardClient';

export default function BillboardPage() {
  return <AdminBillboardClient />;
}
