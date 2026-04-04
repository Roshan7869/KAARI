import { Metadata } from "next";
import AdminCustomers from "@/components/pages/admin/AdminCustomers";

export const metadata: Metadata = {
  title: "Customers | Kaari Admin Dashboard",
  description: "View customer list and manage accounts",
  openGraph: {
    type: "website",
    url: "https://kaari.in/admin/customers",
    title: "Customers | Kaari Admin",
    description: "View customer list and manage accounts",
  },
};

export default function AdminCustomersPage() {
  return <AdminCustomers />;
}
