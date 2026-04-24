'use client';

import dynamic from "next/dynamic";

const Checkout = dynamic(() => import("@/components/pages/Checkout"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse font-body text-muted-foreground">Loading checkout...</div>
    </div>
  ),
});

export default function CheckoutClient() {
  return <Checkout />;
}
