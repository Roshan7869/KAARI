import { Metadata } from "next";
import Checkout from "@/components/pages/Checkout";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export const metadata: Metadata = {
  title: "Checkout | Kaari - Handmade Crochet Marketplace",
  description: "Complete your handmade crochet order with secure checkout",
  openGraph: {
    type: "website",
    url: "https://kaari.in/checkout",
    title: "Checkout | Kaari",
    description: "Complete your order with secure checkout",
  },
};

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  );
}
