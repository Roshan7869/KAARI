import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProductGrid from "@/components/products/ProductGrid";
import CrochetDivider from "@/components/CrochetDivider";
import KaariFooter from "@/components/KaariFooter";
import Navbar from "@/components/Navbar";
import { ProductGridSkeleton } from "@/components/skeletons/BillboardSkeleton";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop Handmade Crochet | Kaari',
  description: "Browse Kaari's full collection of handmade crochet products — tops, bags, hair accessories, and floral bouquets. Each piece is crafted with love.",
  openGraph: {
    title: 'Shop Handmade Crochet | Kaari',
    description: 'Handcrafted crochet products made with love. Shop unique wearables, accessories, and gifts.',
    type: 'website',
  },
};

// ISR: revalidate product listing every 60 seconds
export const revalidate = 60;

export default function ProductsPage() {
  return (
    <main className="overflow-x-hidden" id="main-content" tabIndex={-1}>
      <Navbar />
      <div className="pt-16">
        <ErrorBoundary componentName="Product Grid">
          <Suspense fallback={<ProductGridSkeleton count={9} />}>
            <ProductGrid />
          </Suspense>
        </ErrorBoundary>
        <CrochetDivider />
        <ErrorBoundary componentName="Footer">
          <KaariFooter />
        </ErrorBoundary>
      </div>
    </main>
  );
}
