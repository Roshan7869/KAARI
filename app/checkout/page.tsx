import { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import Checkout from "@/components/pages/Checkout";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { APP_URL } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Checkout | Kaari - Handmade Crochet Marketplace",
  description: "Complete your handmade crochet order with secure checkout",
  openGraph: {
    type: "website",
    url: `${APP_URL}/checkout`,
    title: "Checkout | Kaari",
    description: "Complete your order with secure checkout",
  },
};

export default function CheckoutPage() {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="font-display text-2xl mb-2">Something went wrong</h2>
            <p className="font-body text-muted-foreground mb-4">An error occurred during checkout. Our team has been notified.</p>
            <a href="/checkout" className="text-primary underline">Try again</a>
          </div>
        </div>
      }
    >
      <ProtectedRoute>
        <Checkout />
      </ProtectedRoute>
    </Sentry.ErrorBoundary>
  );
}