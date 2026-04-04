import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProductGridSkeleton, SectionSkeleton } from "@/components/ui/skeleton-loader";

// Removed: TopProductsSection — ProductGrid below shows all products

// Full products grid with filters, search, sort
const ProductGrid = dynamic(() => import("@/components/products/ProductGrid"), {
  loading: () => (
    <section className="py-20 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <ProductGridSkeleton count={9} columns={3} />
      </div>
    </section>
  ),
  ssr: false,
});

const KaariFooter = dynamic(() => import("@/components/KaariFooter"), {
  ssr: false,
  loading: () => <SectionSkeleton height="h-40" />,
});

export default function Home() {
  return (
    <main className="overflow-x-hidden" id="main-content" tabIndex={-1}>
      {/* ── ZONE 1: Brand hero — full-viewport, above the fold ── */}
      <ErrorBoundary componentName="Hero Section">
        <HeroSection />
      </ErrorBoundary>

      {/* ── ZONE 2: All Products — complete catalogue ── */}
      <div id="all-products">
        <ErrorBoundary componentName="Product Grid">
          <ProductGrid />
        </ErrorBoundary>
      </div>

      {/* ── ZONE 3: Footer ── */}
      <ErrorBoundary componentName="Footer">
        <KaariFooter />
      </ErrorBoundary>
    </main>
  );
}
