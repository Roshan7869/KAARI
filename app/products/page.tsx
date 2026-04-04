import ErrorBoundary from "@/components/ErrorBoundary";
import ProductGrid from "@/components/products/ProductGrid";
import CrochetDivider from "@/components/CrochetDivider";
import KaariFooter from "@/components/KaariFooter";
import Navbar from "@/components/Navbar";

// ISR: revalidate product listing every 60 seconds
export const revalidate = 60;

export default function ProductsPage() {
  return (
    <main className="overflow-x-hidden" id="main-content" tabIndex={-1}>
      <Navbar />
      <div className="pt-16">
        <ErrorBoundary componentName="Product Grid">
          <ProductGrid />
        </ErrorBoundary>
        <CrochetDivider />
        <ErrorBoundary componentName="Footer">
          <KaariFooter />
        </ErrorBoundary>
      </div>
    </main>
  );
}
