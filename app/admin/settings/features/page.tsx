
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Settings - Features | Kaari',
  description: 'Admin - Settings - Features page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Settings - Features | Kaari',
    description: 'Admin - Settings - Features page for Kaari Handmade Crochet.',
  },
};

import FeatureFlagsPage from './AdminSettingsFeaturesClient';

export default function AdminSettingsFeaturesPage() {
  return <FeatureFlagsPage />;
}
