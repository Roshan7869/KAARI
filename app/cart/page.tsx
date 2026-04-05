import { Metadata } from "next";
import Cart from "@/components/pages/Cart";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Shopping Cart | Kaari - Handmade Crochet Marketplace",
  description: "Review your selected handmade crochet items before checkout",
  openGraph: {
    type: "website",
    url: `${APP_URL}/cart`,
    title: "Your Shopping Cart | Kaari",
    description: "Review your selected handmade crochet items",
  },
};

export default function CartPage() {
  return (
    <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  );
}
