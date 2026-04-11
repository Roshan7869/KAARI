import { Metadata } from "next";
import AdminSettings from "@/components/pages/admin/AdminSettings";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Settings | Kaari Admin Dashboard",
  description: "Configure store settings, payment methods, and preferences",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/settings`,
    title: "Settings | Kaari Admin",
    description: "Configure store settings and preferences",
  },
};

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
