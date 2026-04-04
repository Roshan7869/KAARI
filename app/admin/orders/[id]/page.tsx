import AdminOrderDetail from "@/components/pages/admin/AdminOrderDetail";

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminOrderDetail />;
}
