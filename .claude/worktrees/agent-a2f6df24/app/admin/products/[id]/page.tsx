import AdminProductForm from "@/pages/admin/AdminProductForm";

export default function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminProductForm />;
}
