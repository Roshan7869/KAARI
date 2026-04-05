import { Suspense } from 'react';
import { HeroBillboard } from '@/components/home/HeroBillboard';
import { ProductShowcase } from '@/components/home/ProductShowcase';
import { getBillboardProducts, getShowcaseProducts } from '@/lib/queries/top-products';
import { BillboardSkeleton, ProductGridSkeleton } from '@/components/skeletons/BillboardSkeleton';
import KaariFooter from '@/components/KaariFooter';

export const revalidate = 60; // ISR — rebuild at most once per minute

async function BillboardSection() {
  const products = await getBillboardProducts();
  return <HeroBillboard products={products} />;
}

async function ShowcaseSection() {
  const products = await getShowcaseProducts(8);
  return <ProductShowcase products={products} />;
}

export default function Home() {
  return (
    <main className="overflow-x-hidden" id="main-content" tabIndex={-1}>
      {/* ── SECTION 1: Admin-curated hero billboard ── */}
      <Suspense fallback={<BillboardSkeleton />}>
        <BillboardSection />
      </Suspense>

      {/* ── SECTION 2: Product showcase grid ── */}
      <Suspense
        fallback={
          <section className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
            <ProductGridSkeleton count={8} />
          </section>
        }
      >
        <ShowcaseSection />
      </Suspense>

      {/* ── SECTION 3: Footer ── */}
      <KaariFooter />
    </main>
  );
}
