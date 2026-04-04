import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ProductGridSkeleton, SectionSkeleton } from "@/components/ui/skeleton-loader";

// TopProductsSection — fetches featured products via Supabase + Cloudinary
const TopProductsSection = dynamic(() => import("@/components/TopProductsSection"), {
  loading: () => (
    <section className="py-20 md:py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="w-32 h-4 bg-stone-200 animate-pulse rounded mx-auto mb-4" />
          <div className="w-64 h-10 bg-stone-200 animate-pulse rounded mx-auto" />
        </div>
        <ProductGridSkeleton count={6} columns={3} />
      </div>
    </section>
  ),
  ssr: false,
});

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

      {/* ── ZONE 2: Top Products Collection ── */}
      <ErrorBoundary componentName="Top Products">
        <TopProductsSection />
      </ErrorBoundary>

      {/* ── ZONE 3: All Products — complete catalogue ── */}
      <div id="all-products">
        <ErrorBoundary componentName="Product Grid">
          <ProductGrid />
        </ErrorBoundary>
      </div>

      {/* ── ZONE 4: Footer ── */}
      <ErrorBoundary componentName="Footer">
        <KaariFooter />
      </ErrorBoundary>
    </main>
  );
}
