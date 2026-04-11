'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveProductImageUrl } from '@/lib/product-media';
import { logger } from '@/lib/logger';

interface WishlistItem {
  id: string;
  added_at: string;
  products: {
    id: string;
    title: string;
    slug: string;
    base_price: number;
    media: Array<{
      file_path: string;
      alt_text: string | null;
    }> | null;
  } | null;
}

export function WishlistClient() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, isLoaded } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (isLoaded && !user) {
      router.push('/login?redirect=/wishlist');
      return;
    }

    if (!isLoaded || !user) return;

    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/wishlist');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch wishlist');
        }

        setItems(data.items || []);
      } catch (err) {
        logger.error('Failed to fetch wishlist', { error: (err as Error).message });
        setError('Failed to load wishlist. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, isLoaded, router]);

  const removeFromWishlist = async (itemId: string, productId: string) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove item');
      }

      // Remove item from local state
      setItems(prev => prev.filter(item => item.id !== itemId));
      logger.info('Product removed from wishlist', { productId });
    } catch (err) {
      logger.error('Failed to remove from wishlist', { error: (err as Error).message, productId });
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="font-body text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-sm font-body text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-foreground">My Wishlist</h1>
        <p className="font-body text-muted-foreground mt-2">
          {items.length > 0
            ? `You have ${items.length} saved item${items.length > 1 ? 's' : ''}`
            : 'Your wishlist is empty'
          }
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Heart className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl mb-2">Your wishlist is empty</h2>
          <p className="font-body text-muted-foreground mb-6 max-w-md mx-auto">
            Save items you love to buy them later. Tap the heart icon on any product to add it here.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm font-body text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            if (!item.products) return null;

            const product = item.products;
            const imageUrl = product.media?.[0]?.file_path
              ? resolveProductImageUrl(product.media[0].file_path)
              : '/placeholder.svg';
            const altText = product.media?.[0]?.alt_text || product.title;

            return (
              <div
                key={item.id}
                className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square">
                  <Link href={`/products/${product.slug}`}>
                    <Image
                      src={imageUrl}
                      alt={altText}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </Link>

                  <button
                    onClick={() => removeFromWishlist(item.id, product.id)}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                    aria-label={`Remove ${product.title} from wishlist`}
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="p-4">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-body text-lg font-medium text-foreground line-clamp-2 mb-1">
                      {product.title}
                    </h3>
                  </Link>

                  <p className="font-display text-lg text-primary font-semibold mt-2">
                    ₹{product.base_price.toLocaleString('en-IN')}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex-1 px-3 py-2 text-center bg-muted hover:bg-muted/80 rounded-sm font-body text-sm transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => removeFromWishlist(item.id, product.id)}
                      className="px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-sm font-body text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}