import { Metadata } from "next";
import dynamic from "next/dynamic";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton-loader";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Admin Dashboard | Kaari",
  description: "Kaari Marketplace Admin Dashboard",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin`,
    title: "Admin Dashboard | Kaari",
    description: "Manage products, orders, and customers",
  },
};

const AdminDashboard = dynamic(
  () => import("@/components/pages/admin/AdminDashboard"),
  { loading: () => <AdminDashboardSkeleton /> }
);

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
