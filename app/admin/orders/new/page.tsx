import { Metadata } from "next";
import { APP_URL } from "@/lib/metadata";
import AdminNewOrder from "@/components/pages/admin/AdminNewOrder";

export const metadata: Metadata = {
  title: "Create Order | Kaari Admin",
  description: "Manually create a new order for a customer",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/orders/new`,
    title: "Create Order | Kaari Admin",
    description: "Manually create a new order",
  },
};

export default function AdminNewOrderPage() {
  return <AdminNewOrder />;
}
