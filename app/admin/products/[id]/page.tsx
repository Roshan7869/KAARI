import AdminProductForm from "@/components/pages/admin/AdminProductForm";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminProductForm />;
}
