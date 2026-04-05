import OrderConfirmation from "@/pages/OrderConfirmation";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function OrderConfirmationPage({
  params,
}: {
  params: { orderId: string };
}) {
  return (
    <ProtectedRoute>
      <OrderConfirmation />
    </ProtectedRoute>
  );
}
