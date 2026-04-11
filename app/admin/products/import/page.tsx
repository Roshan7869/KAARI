import { Metadata } from "next";
import { APP_URL } from "@/lib/metadata";
import AdminProductImport from "@/components/pages/admin/AdminProductImport";

export const metadata: Metadata = {
  title: "Import Products | Kaari Admin",
  description: "Bulk import products via CSV",
  openGraph: {
    type: "website",
    url: `${APP_URL}/admin/products/import`,
    title: "Import Products | Kaari Admin",
    description: "Bulk import products via CSV",
  },
};

export default function AdminProductImportPage() {
  return <AdminProductImport />;
}
