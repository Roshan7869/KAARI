import { Skeleton } from '@/components/ui/skeleton';

export function BillboardSkeleton() {
  return (
    <div
      className="w-full h-[92vh] min-h-[560px] max-h-[900px] relative bg-stone-200 overflow-hidden"
      aria-busy="true"
      aria-label="Loading billboard..."
    >
      <Skeleton className="absolute inset-0 rounded-none bg-stone-300" />
      {/* Text area skeleton */}
      <div className="absolute inset-0 flex items-center px-6 md:px-16">
        <div className="space-y-4 max-w-xl">
          <Skeleton className="h-5 w-24 rounded-full bg-white/30" />
          <Skeleton className="h-14 w-80 rounded-lg bg-white/30" />
          <Skeleton className="h-5 w-72 rounded bg-white/30" />
          <Skeleton className="h-5 w-56 rounded bg-white/30" />
          <Skeleton className="h-10 w-32 rounded-full bg-white/30" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-36 rounded-full bg-white/30" />
            <Skeleton className="h-12 w-36 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full bg-white/40" />
        ))}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white">
      <Skeleton className="aspect-[4/5] w-full bg-stone-200" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded bg-stone-200" />
        <Skeleton className="h-4 w-1/2 rounded bg-stone-200" />
        <Skeleton className="h-6 w-1/3 rounded bg-stone-200" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
