
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Stories | Kaari',
  description: 'Admin - Stories page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Stories | Kaari',
    description: 'Admin - Stories page for Kaari Handmade Crochet.',
  },
};

import AdminStoriesClient from './AdminStoriesClient';

export default function StoriesPage() {
  return <AdminStoriesClient />;
}
