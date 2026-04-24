
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Products - New | Kaari',
  description: 'Admin - Products - New page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Products - New | Kaari',
    description: 'Admin - Products - New page for Kaari Handmade Crochet.',
  },
};

import AdminProductForm from "@/components/pages/admin/AdminProductForm";

export default function NewProductPage() {
  return <AdminProductForm productId="new" />;
}
