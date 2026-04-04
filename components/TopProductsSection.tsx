'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { resolveProductImageUrl } from '@/lib/product-media';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';

interface TopProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  category: string;
}

async function fetchTopProducts(): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      slug,
      category,
      base_price,
      product_media (file_path)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) return [];

  return (data || []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.base_price,
    image: resolveProductImageUrl(p.product_media?.[0]?.file_path),
    category: p.category || 'Handmade',
  }));
}

export default function TopProductsSection() {
  const { data: products = [], isLoading } = useQuery<TopProduct[]>({
    queryKey: ['top-products'],
    queryFn: fetchTopProducts,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <section className="py-20 md:py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="font-heritage text-accent text-xs tracking-[0.35em] uppercase mb-3">
            Handcrafted Exclusively
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-stone-800 mb-4">
            Our Top Collection
          </h2>
          <div className="w-14 h-px bg-accent mx-auto" />
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center font-heritage text-muted-foreground py-12">
            Products coming soon — check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: 'easeOut' }}
              >
                <Link
                  href={`/products/${product.slug}`}
                  className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {/* Bottom gradient + CTA */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <span className="w-full text-center pb-4 font-body text-xs tracking-[0.15em] uppercase text-white">
                        Shop Now →
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="font-heritage text-accent text-[10px] tracking-[0.25em] uppercase mb-1">
                      {product.category}
                    </p>
                    <h3 className="font-display text-base text-stone-800 leading-snug mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="font-display text-base text-primary font-semibold">
                      ₹{product.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* View All link */}
        {!isLoading && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-10"
          >
            <a
              href="#all-products"
              className="inline-block font-body text-xs tracking-[0.2em] uppercase text-stone-500 hover:text-primary border-b border-stone-300 hover:border-primary pb-0.5 transition-colors duration-200"
            >
              View All Products ↓
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
