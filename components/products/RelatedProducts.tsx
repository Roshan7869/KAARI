'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { resolveProductImageUrl } from '@/lib/product-media';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';

interface RelatedProduct {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  image: string;
  category: string | null;
}

interface RelatedProductsProps {
  currentProductId: string;
  category?: string | null;
}

export default function RelatedProducts({ currentProductId, category }: RelatedProductsProps) {
  const { data: related = [], isLoading } = useQuery<RelatedProduct[]>({
    queryKey: ['related-products', currentProductId, category],
    queryFn: async () => {
      if (!category) return [];

      const { data, error } = await supabase
        .from('products')
        .select('id, title, slug, base_price, category, product_media(file_path, is_primary, sort_order)')
        .eq('is_active', true)
        .eq('category', category)
        .neq('id', currentProductId)
        .limit(4);

      if (error || !data) return [];

      return data.map((p) => {
        const media = (p.product_media as Array<{ file_path: string; is_primary: boolean; sort_order: number }> | null)
          ?.sort((a, b) => a.sort_order - b.sort_order) ?? [];
        const primaryMedia = media.find((m) => m.is_primary) ?? media[0];
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          base_price: p.base_price,
          category: p.category,
          image: resolveProductImageUrl(primaryMedia?.file_path ?? null),
        };
      });
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!currentProductId && !!category,
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-warm">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs tracking-[0.2em] uppercase text-maroon/60 mb-2">Explore More</p>
            <h2 className="font-display text-2xl md:text-3xl text-maroon-deep">You May Also Love</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (related.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-xs tracking-[0.2em] uppercase text-maroon/60 mb-2">Explore More</p>
          <h2 className="font-display text-2xl md:text-3xl text-maroon-deep">You May Also Love</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mt-8">
          {related.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="group">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-cream-warm">
                {product.image && (
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-display text-sm md:text-base text-maroon-deep line-clamp-1 group-hover:text-maroon transition-colors">
                  {product.title}
                </h3>
                <p className="text-sm text-maroon/70">₹{product.base_price.toLocaleString('en-IN')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}