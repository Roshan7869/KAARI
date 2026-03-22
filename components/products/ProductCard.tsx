'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/data/products';

interface GridProduct {
  id?: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  allowCustomization?: boolean;
}

interface ProductCardProps {
  product: Product | GridProduct;
  index?: number;
}

function isGridProduct(product: Product | GridProduct): product is GridProduct {
  return 'title' in product && 'image' in product && !('name' in product);
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  if (isGridProduct(product)) {
    return (
      <motion.div
        data-testid="product-card"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="h-full"
      >
        <Link
          href={`/products/${product.slug}`}
          className="group glass-card-cream block cursor-pointer h-full overflow-hidden rounded-xl"
        >
          <div className="aspect-[3/4] overflow-hidden relative">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileHover={{ y: 0, opacity: 1 }}
              className="absolute inset-x-0 bottom-0 p-4"
            >
              <span className="block w-full text-center py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.15em] uppercase rounded-lg">
                View Details
              </span>
            </motion.div>
          </div>

          <div className="p-5 space-y-2">
            <p className="font-heritage text-accent text-xs tracking-[0.2em] uppercase">
              {product.category}
            </p>
            <h3 className="font-display text-lg text-foreground leading-tight">
              {product.title}
            </h3>

            {product.allowCustomization && (
              <p className="font-body text-xs text-accent">Customizable</p>
            )}

            <p className="font-display text-lg text-primary font-semibold">
              ₹{product.price.toLocaleString('en-IN')}
            </p>
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
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="h-full"
    >
      <Link
        href={`/products/${staticProduct.slug}`}
        className="group glass-card-cream block cursor-pointer h-full overflow-hidden rounded-xl"
      >
        <div className="aspect-[3/4] overflow-hidden relative">
          <Image
            src={staticProduct.images[0]}
            alt={staticProduct.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-kaari-dark/0 group-hover:bg-kaari-dark/20 transition-colors duration-500" />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileHover={{ y: 0, opacity: 1 }}
            className="absolute inset-x-0 bottom-0 p-4"
          >
            <span className="block w-full text-center py-3 bg-primary text-primary-foreground font-body text-xs tracking-[0.15em] uppercase border border-kaari-gold/30 rounded-lg">
              View Details
            </span>
          </motion.div>
        </div>

        <div className="p-5 space-y-2">
          <p className="font-heritage text-accent text-xs tracking-[0.2em] uppercase">
            {staticProduct.category}
          </p>
          <h3 className="font-display text-lg text-foreground leading-tight">
            {staticProduct.name}
          </h3>

          <div className="flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(staticProduct.rating)
                      ? 'fill-accent text-accent'
                      : 'text-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-body">
              ({staticProduct.reviewCount})
            </span>
          </div>

          <p className="font-display text-lg text-primary font-semibold">
            ₹{staticProduct.price.toLocaleString('en-IN')}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}