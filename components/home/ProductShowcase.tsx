'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { ShoppingBag, Heart } from 'lucide-react';
import type { ShowcaseProduct } from '@/lib/queries/top-products';

interface Props {
  products: ShowcaseProduct[];
}

function ProductCard({ product, index }: { product: ShowcaseProduct; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const tagStyle =
    product.tag?.toLowerCase() === 'new'
      ? 'bg-maroon text-gold-light'
      : product.tag?.toLowerCase() === 'hot'
        ? 'bg-orange-600 text-white'
        : 'bg-maroon/80 text-gold-light';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08, ease: 'easeOut' }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-2xl overflow-hidden border border-maroon/[0.06] bg-ivory hover:shadow-xl transition-all duration-300"
        aria-label={`View ${product.name} — ₹${product.price.toLocaleString('en-IN')}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-cream-warm">
          <Image
            src={product.imageUrl || '/placeholder.svg'}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
            }}
          />

          {product.tag && (
            <span className={`absolute top-3 left-3 z-10 text-[10px] font-dm-sans font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${tagStyle}`}>
              {product.tag}
            </span>
          )}

          {/* Wishlist button — top right on hover */}
          <button
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
            aria-label={`Add ${product.name} to wishlist`}
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="w-4 h-4 text-maroon" />
          </button>

          {/* Quick add bar — bottom on hover */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-maroon/90 backdrop-blur-sm p-3">
            <span className="w-full flex items-center justify-center gap-2 text-gold-light font-dm-sans text-xs font-semibold tracking-wider uppercase">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              Quick View
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-1.5">
          <h3 className="font-dm-sans font-semibold text-maroon-deep leading-snug line-clamp-2 group-hover:text-maroon transition-colors text-sm">
            {product.name}
          </h3>
          <p className="font-cormorant font-bold text-lg text-maroon">
            ₹{product.price.toLocaleString('en-IN')}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductShowcase({ products }: Props) {
  if (!products.length) return null;

  return (
    <section
      id="products"
      className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto"
      aria-label="Our products"
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="font-dm-sans text-xs text-maroon/50 uppercase tracking-[0.25em] mb-2">
            Handcrafted for you
          </p>
          <h2 className="font-cormorant text-3xl md:text-4xl text-maroon-deep font-semibold">
            Our Collection
          </h2>
        </div>
        <Link
          href="/products"
          className="hidden sm:inline-flex h-10 px-6 rounded-full border border-maroon/15 text-maroon font-dm-sans text-xs tracking-wider uppercase items-center gap-1.5 hover:bg-maroon hover:text-white transition-all duration-300"
        >
          View All →
        </Link>
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        role="list"
        aria-label="Product list"
      >
        {products.map((product, i) => (
          <div key={product.id} role="listitem">
            <ProductCard product={product} index={i} />
          </div>
        ))}
      </div>

      {/* Mobile view-all */}
      <div className="mt-10 flex justify-center sm:hidden">
        <Link
          href="/products"
          className="w-full max-w-xs h-11 rounded-full border border-maroon/15 text-maroon font-dm-sans text-xs tracking-wider uppercase flex items-center justify-center hover:bg-maroon hover:text-white transition-all duration-300"
        >
          View All Products →
        </Link>
      </div>
    </section>
  );
}
