import AdminOrderDetail from "@/components/pages/admin/AdminOrderDetail";

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminOrderDetail />;
}
