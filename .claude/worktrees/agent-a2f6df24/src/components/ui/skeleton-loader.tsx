export function ProductCardSkeleton() {
  return (
    <div className="fabric-card p-4 animate-pulse">
      <div className="aspect-square bg-muted rounded-sm mb-4" />
      <div className="h-6 bg-muted rounded-sm mb-2" />
      <div className="h-4 bg-muted rounded-sm mb-4 w-3/4" />
      <div className="h-6 bg-muted rounded-sm w-1/3" />
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="fabric-card p-6 animate-pulse">
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-muted rounded-sm w-1/2" />
          <div className="h-4 bg-muted rounded-sm" />
          <div className="h-4 bg-muted rounded-sm w-1/3" />
        </div>
        <div className="h-6 bg-muted rounded-sm w-20" />
      </div>
    </div>
  );
}

export function CheckoutFormSkeleton() {
  return (
    <div className="fabric-card p-6 animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded-sm w-1/3 mb-6" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-12 bg-muted rounded-sm" />
        <div className="h-12 bg-muted rounded-sm" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-12 bg-muted rounded-sm" />
        <div className="h-12 bg-muted rounded-sm" />
      </div>
    </div>
  );
}
