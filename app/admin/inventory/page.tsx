import { Metadata } from "next";
import { APP_URL } from "@/lib/metadata";
import AdminInventory from "@/components/pages/admin/AdminInventory";

export const metadata: Metadata = {
  title: "Inventory | Kaari Admin",
  description: "Manage product stock levels",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/inventory`,
    title: "Inventory | Kaari Admin",
    description: "Manage product stock levels",
  },
};

export default function AdminInventoryPage() {
  return <AdminInventory />;
}
