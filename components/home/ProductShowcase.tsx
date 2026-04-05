'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';
import type { ShowcaseProduct } from '@/lib/queries/top-products';

interface Props {
  products: ShowcaseProduct[];
}

function ProductCard({ product, index }: { product: ShowcaseProduct; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08, ease: 'easeOut' }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-2xl overflow-hidden border border-stone-200 bg-white hover:shadow-xl transition-all duration-300"
        aria-label={`View ${product.name} — ₹${product.price.toLocaleString('en-IN')}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
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
            <Badge className="absolute top-3 left-3 z-10 font-body text-xs">
              {product.tag}
            </Badge>
          )}

          {/* Quick view overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <span className="w-full flex items-center justify-center gap-2 bg-white text-stone-900 rounded-xl py-2.5 font-body text-sm font-semibold">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              Quick View
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-1">
          <h3 className="font-body font-semibold text-stone-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="font-display font-bold text-lg text-primary">
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
          <p className="font-body text-sm text-stone-400 uppercase tracking-widest mb-2">
            Handcrafted for you
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-stone-800">
            Our Collection
          </h2>
        </div>
        <Button variant="outline" asChild className="hidden sm:flex rounded-full font-body">
          <Link href="/products">View All →</Link>
        </Button>
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
        <Button variant="outline" asChild className="rounded-full w-full max-w-xs font-body">
          <Link href="/products">View All Products →</Link>
        </Button>
      </div>
    </section>
  );
}
