
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Reviews | Kaari',
  description: 'Admin - Reviews page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Reviews | Kaari',
    description: 'Admin - Reviews page for Kaari Handmade Crochet.',
  },
};

import AdminReviewsClient from './AdminReviewsClient';

export default function ReviewsPage() {
  return <AdminReviewsClient />;
}
