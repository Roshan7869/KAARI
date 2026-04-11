'use client';

import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  productId: string | undefined;
  slug: string;
  title: string;
  price: number;
}

export default function AddToCartButton({
  productId,
  slug,
  title,
  price,
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addToCart, loading } = useCart();
  const router = useRouter();

  // UUID format check — Supabase IDs are UUIDs; static product IDs are slugs.
  const isRealDbProduct = !!productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

  const ensureAuth = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=/products/${slug}`);
      return false;
    }

    return true;
  };

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ensureAuth(e)) return;

    if (!isRealDbProduct) {
      router.push(`/products/${slug}`);
      return;
    }

    await addToCart({
      productId: productId!,
      quantity: 1,
      title,
      itemType: 'standard',
      unitPrice: price,
    });
  };

  const handleBuyNow = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ensureAuth(e)) return;

    if (!isRealDbProduct) {
      router.push(`/products/${slug}`);
      return;
    }

    await addToCart({
      productId: productId!,
      quantity: 1,
      title,
      itemType: 'standard',
      unitPrice: price,
    });

    router.push('/checkout');
  };

  if (!isRealDbProduct) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleAddToCart}
          className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.12em] uppercase rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
          aria-label={`View details for ${title}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </button>
        <button
          onClick={() => router.push(`/products/${slug}`)}
          className="w-full py-3 border border-primary text-primary font-body text-xs tracking-[0.12em] uppercase rounded-lg hover:bg-primary hover:text-primary-foreground active:scale-[0.98] transition-all duration-200"
          aria-label={`Buy ${title} now`}
        >
          Buy Now
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.12em] uppercase rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={`Add ${title} to cart`}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Add to Cart
      </button>

      <button
        onClick={handleBuyNow}
        disabled={loading}
        className="w-full py-3 border border-primary text-primary font-body text-xs tracking-[0.12em] uppercase rounded-lg hover:bg-primary hover:text-primary-foreground active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={`Buy ${title} now`}
      >
        Buy Now
      </button>
    </div>
  );
}
