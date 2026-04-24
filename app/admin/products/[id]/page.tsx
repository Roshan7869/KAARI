
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Products - [id] | Kaari',
  description: 'Admin - Products - [id] page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Products - [id] | Kaari',
    description: 'Admin - Products - [id] page for Kaari Handmade Crochet.',
  },
};

import AdminProductForm from "@/components/pages/admin/AdminProductForm";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = id?.trim();
  if (!productId) {
    notFound();
  }
  return <AdminProductForm productId={productId} />;
}
