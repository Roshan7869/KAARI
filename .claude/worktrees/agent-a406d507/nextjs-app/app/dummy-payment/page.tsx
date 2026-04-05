import DummyPayment from "@/pages/DummyPayment";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function DummyPaymentPage() {
  return (
    <ProtectedRoute>
      <DummyPayment />
    </ProtectedRoute>
  );
}
