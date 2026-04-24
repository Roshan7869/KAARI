
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Account - Settings | Kaari',
  description: 'Account - Settings page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Account - Settings | Kaari',
    description: 'Account - Settings page for Kaari Handmade Crochet.',
  },
};

import AccountSettingsClient from './AccountSettingsClient';

export default function AccountSettingsPage() {
  return <AccountSettingsClient />;
}
