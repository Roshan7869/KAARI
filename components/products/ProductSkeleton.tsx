export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card h-full flex flex-col">
      <div className="skeleton-product-image" />
      <div className="skeleton-product-content p-5 space-y-2">
        <div className="skeleton-glass h-3 w-16 rounded" />
        <div className="skeleton-product-title rounded" />
        <div className="skeleton-glass h-4 w-1/2 rounded" />
        <div className="skeleton-product-price rounded mt-2" />
        <div className="skeleton-glass h-9 w-full rounded-lg mt-3" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="skeleton-glass aspect-[3/4] rounded-xl" />
        <div className="space-y-5">
          <div className="skeleton-glass h-4 w-24 rounded" />
          <div className="skeleton-glass h-9 w-3/4 rounded" />
          <div className="skeleton-glass h-7 w-32 rounded" />
          <div className="space-y-2 pt-2">
            <div className="skeleton-glass h-4 w-full rounded" />
            <div className="skeleton-glass h-4 w-5/6 rounded" />
            <div className="skeleton-glass h-4 w-4/6 rounded" />
          </div>
          <div className="flex gap-3 pt-4">
            <div className="skeleton-glass h-11 w-28 rounded-lg" />
            <div className="skeleton-glass h-11 flex-1 rounded-lg" />
            <div className="skeleton-glass h-11 flex-1 rounded-lg" />
          </div>
          <div className="skeleton-glass h-28 w-full rounded-xl mt-2" />
        </div>
      </div>
    </div>
  );
}
