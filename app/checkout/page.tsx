import { Metadata } from "next";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_URL } from "@/lib/metadata";
import CheckoutClient from "@/components/pages/CheckoutClient";

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
            <Button asChild variant="default">
              <Link href="/checkout">Try again</Link>
            </Button>
          </div>
        </div>
      }
    >
      <CheckoutClient />
    </Sentry.ErrorBoundary>
  );
}
