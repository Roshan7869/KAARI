
import { Metadata } from 'next';
import { APP_URL } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Admin - Orders - [id] | Kaari',
  description: 'Admin - Orders - [id] page for Kaari Handmade Crochet.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/`,
    title: 'Admin - Orders - [id] | Kaari',
    description: 'Admin - Orders - [id] page for Kaari Handmade Crochet.',
  },
};

import AdminOrderDetail from "@/components/pages/admin/AdminOrderDetail";
import { notFound } from "next/navigation";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = id?.trim();
  if (!orderId) {
    notFound();
  }
  return <AdminOrderDetail orderId={orderId} />;
}
