'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Product } from '@/data/products';
import { WishlistButton } from '@/components/ui/WishlistButton';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export interface GridProduct {
  id?: string;
  title: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  image: string;
  category: string;
  allowCustomization?: boolean;
  average_rating?: number | null;
  review_count?: number;
  badge?: 'new' | 'hot' | 'sold_out' | 'custom' | null;
}

interface ProductCardProps {
  product: Product | GridProduct;
  index?: number;
  initialWishlisted?: boolean;
}

function isGridProduct(product: Product | GridProduct): product is GridProduct {
  return 'title' in product && 'image' in product && !('name' in product);
}

const BADGE_STYLES: Record<NonNullable<GridProduct['badge']>, string> = {
  new: 'bg-primary text-primary-foreground',
  hot: 'bg-red-600 text-white',
  sold_out: 'bg-black/70 text-white',
  custom: 'bg-[#3D0A14] text-amber-300 border border-amber-300/40',
};

const BADGE_LABELS: Record<NonNullable<GridProduct['badge']>, string> = {
  new: 'New',
  hot: 'Hot',
  sold_out: 'Sold Out',
  custom: 'Custom',
};

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFilled = i < Math.floor(rating);
          const isHalf = !isFilled && i === Math.floor(rating) && rating % 1 >= 0.5;
          return (
            <Star
              key={i}
              size={13}
              className={
                isFilled
                  ? 'fill-[#D4AF7F] text-[#D4AF7F]'
                  : isHalf
                  ? 'fill-[#e8d0a0] text-[#D4AF7F]'
                  : 'text-muted-foreground/40'
              }
            />
          );
        })}
      </div>
      <span className="font-body text-[11px] text-muted-foreground">
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  );
}

function QuickAddButton({
  productId,
  slug,
  title,
  price,
}: {
  productId: string | undefined;
  slug: string;
  title: string;
  price: number;
}) {
  const { user } = useAuth();
  const { addToCart, loading } = useCart();
  const router = useRouter();

  const isRealDb =
    !!productId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (!isRealDb) {
      router.push(`/products/${slug}`);
      return;
    }
    await addToCart({ productId: productId!, quantity: 1, title, itemType: 'standard', unitPrice: price });
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 w-full py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.12em] uppercase rounded-lg transition-opacity disabled:opacity-60"
    >
      <ShoppingCart size={13} />
      Quick Add
    </button>
  );
}

export default function ProductCard({ product, index = 0, initialWishlisted = false }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  if (isGridProduct(product)) {
    const discount =
      product.compare_at_price && product.compare_at_price > product.price
        ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        : null;

    return (
      <motion.div
        data-testid="product-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.4) }}
        whileHover={{ y: -4 }}
        className="h-full"
      >
        <Link
          href={`/products/${product.slug}`}
          className="group flex flex-col cursor-pointer h-full overflow-hidden rounded-[14px] bg-[#fffbf8] border border-[rgba(139,31,42,0.06)] shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          {/* Image area */}
          <div className="aspect-[4/5] overflow-hidden relative flex-shrink-0">
            <Image
              src={imgError ? '/placeholder.svg' : product.image}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-[1.08] transition-transform duration-700"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

            {/* Badge top-left */}
            {product.badge && (
              <span
                className={`absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full font-body text-[10px] tracking-[0.08em] uppercase font-semibold ${BADGE_STYLES[product.badge]}`}
              >
                {BADGE_LABELS[product.badge]}
              </span>
            )}

            {/* Wishlist top-right */}
            <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <WishlistButton
                productId={product.id || ''}
                initialWishlisted={initialWishlisted}
                size="sm"
              />
            </div>

            {/* Quick Add slides up on hover */}
            <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <QuickAddButton
                productId={product.id}
                slug={product.slug}
                title={product.title}
                price={product.price}
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-4 flex flex-col gap-1.5 flex-1">
            <p className="font-body text-[9px] tracking-[0.12em] uppercase text-[#8B1F2A]/65">
              {product.category}
            </p>
            <h3 className="font-display text-base text-foreground leading-snug">
              {product.title}
            </h3>

            {typeof product.average_rating === 'number' &&
              product.average_rating > 0 &&
              (product.review_count ?? 0) > 0 && (
                <StarRow rating={product.average_rating} count={product.review_count!} />
              )}

            <div className="flex items-baseline gap-2 mt-auto pt-1">
              <span className="font-display text-base text-primary font-semibold">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <>
                  <span className="font-body text-xs text-muted-foreground line-through">
                    ₹{product.compare_at_price.toLocaleString('en-IN')}
                  </span>
                  {discount && (
                    <span className="font-body text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                      {discount}% off
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  const staticProduct = product as Product;
  return (
    <motion.div
      data-testid="product-card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.4) }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        href={`/products/${staticProduct.slug}`}
        className="group flex flex-col cursor-pointer h-full overflow-hidden rounded-[14px] bg-[#fffbf8] border border-[rgba(139,31,42,0.06)] shadow-sm hover:shadow-md transition-shadow duration-300"
      >
        <div className="aspect-[4/5] overflow-hidden relative flex-shrink-0">
          <Image
            src={imgError ? '/placeholder.svg' : staticProduct.images[0]}
            alt={staticProduct.name}
            fill
            className="object-cover group-hover:scale-[1.08] transition-transform duration-700"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <WishlistButton productId="" initialWishlisted={initialWishlisted} size="sm" />
          </div>

          {/* Quick Add slides up on hover */}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Link
              href={`/products/${staticProduct.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.12em] uppercase rounded-lg"
            >
              <ShoppingCart size={13} />
              Quick Add
            </Link>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-1.5 flex-1">
          <p className="font-body text-[9px] tracking-[0.12em] uppercase text-[#8B1F2A]/65">
            {staticProduct.category}
          </p>
          <h3 className="font-display text-base text-foreground leading-snug">
            {staticProduct.name}
          </h3>

          <StarRow rating={staticProduct.rating} count={staticProduct.reviewCount} />

          <div className="mt-auto pt-1">
            <span className="font-display text-base text-primary font-semibold">
              ₹{staticProduct.price.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}