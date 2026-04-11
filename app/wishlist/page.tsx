import { Suspense } from 'react';
import { WishlistClient } from './WishlistClient';

export default function WishlistPage() {
  return (
    <Suspense fallback={<WishlistLoading />}>
      <WishlistClient />
    </Suspense>
  );
}

function WishlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-foreground">My Wishlist</h1>
        <p className="font-body text-muted-foreground mt-2">
          Your saved items for later
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-background border border-border rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}