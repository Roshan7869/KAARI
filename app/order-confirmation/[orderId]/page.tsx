import { Metadata } from "next";
import OrderConfirmation from "@/components/pages/OrderConfirmation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { APP_URL } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  return {
    title: `Order ${orderId} - Confirmation | Kaari`,
    description: "Thank you for your handmade crochet order",
    openGraph: {
      type: "website",
      url: `${APP_URL}/order-confirmation/${orderId}`,
      title: `Order ${orderId} - Confirmation | Kaari`,
      description: "Your order has been placed successfully",
    },
  };
}

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <ProtectedRoute>
      <OrderConfirmation />
    </ProtectedRoute>
  );
}
