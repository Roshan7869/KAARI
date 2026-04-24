
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Account | Kaari',
  description: 'Account page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Account | Kaari',
    description: 'Account page for Kaari Handmade Crochet.',
  },
};

import { redirect } from 'next/navigation';

export default function AccountPage() {
  redirect('/account/settings');
}
