import { Metadata } from "next";
import { APP_URL } from "@/lib/metadata";
import AdminAuditLog from "@/components/pages/admin/AdminAuditLog";

export const metadata: Metadata = {
  title: "Audit Log | Kaari Admin",
  description: "View all admin actions and system events",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/audit`,
    title: "Audit Log | Kaari Admin",
    description: "Admin activity audit trail",
  },
};

export default function AdminAuditPage() {
  return <AdminAuditLog />;
}
