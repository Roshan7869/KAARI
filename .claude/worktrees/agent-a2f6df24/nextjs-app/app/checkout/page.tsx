import Checkout from "@/pages/Checkout";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  );
}
