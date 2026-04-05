import Cart from "@/pages/Cart";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export default function CartPage() {
  return (
    <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  );
}
