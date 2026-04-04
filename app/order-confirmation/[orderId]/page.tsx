import { Metadata } from "next";
import OrderConfirmation from "@/components/pages/OrderConfirmation";
import ProtectedRoute from "@/app/components/ProtectedRoute";

export async function generateMetadata({
  params,
}: {
  params: { orderId: string };
}): Promise<Metadata> {
  return {
    title: `Order ${params.orderId} - Confirmation | Kaari`,
    description: "Thank you for your handmade crochet order",
    openGraph: {
      type: "website",
      url: `https://kaari.in/order-confirmation/${params.orderId}`,
      title: `Order ${params.orderId} - Confirmation | Kaari`,
      description: "Your order has been placed successfully",
    },
  };
}

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
