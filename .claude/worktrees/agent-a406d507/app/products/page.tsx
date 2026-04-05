import ErrorBoundary from "@/components/ErrorBoundary";
import ProductGrid from "@/components/products/ProductGrid";
import CrochetDivider from "@/components/CrochetDivider";
import KaariFooter from "@/components/KaariFooter";
import Navbar from "@/components/Navbar";

export default function ProductsPage() {
  return (
    <main className="overflow-x-hidden">
      <Navbar variant="solid" />
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
