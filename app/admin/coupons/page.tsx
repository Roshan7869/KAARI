import { APP_URL } from '@/lib/metadata';
import type { Metadata } from 'next';
import AdminCoupons from '@/components/pages/admin/AdminCoupons';

export const metadata: Metadata = {
  title: 'Coupons — Kaari Admin',
  robots: { index: false, follow: false },
  openGraph: { url: `${APP_URL}/admin/coupons` },
};

export default function AdminCouponsPage() {
  return (
    <div className="p-6">
      <AdminCoupons />
    </div>
  );
}
