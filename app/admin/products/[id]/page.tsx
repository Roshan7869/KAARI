import AdminProductForm from "@/components/pages/admin/AdminProductForm";

export default function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminProductForm />;
}
