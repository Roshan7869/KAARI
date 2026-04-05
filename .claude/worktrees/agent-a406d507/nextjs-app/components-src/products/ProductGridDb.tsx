import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIES = ['All', 'Dolls', 'Flowers', 'Accessories', 'Home'];

interface Product {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  product_type: string;
  allow_customization: boolean;
  is_active: boolean;
  product_media: Array<{
    file_path: string;
    alt_text: string;
  }>;
}

export default function ProductGridDb() {
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          base_price,
          product_type,
          allow_customization,
          is_active,
          product_media (file_path, alt_text)
        `)
        .eq('is_active', true);

      if (activeCategory !== 'All') {
        query = query.ilike('title', `%${activeCategory}%`);
      }

      const { data, error } = await query.limit(12);
      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <section className="py-24 md:py-32 bg-gradient-warm">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="font-heritage text-accent text-sm tracking-[0.3em] uppercase mb-4">
            Shop Handmade
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-foreground mb-4">
            Our Crochet Collection
          </h1>
          <p className="font-heritage text-muted-foreground text-lg max-w-xl mx-auto">
            Each piece is lovingly handcrafted by skilled Indian artisans using premium yarn
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 font-body text-xs tracking-[0.15em] uppercase border transition-all duration-300 rounded-sm ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-accent hover:text-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heritage text-xl text-muted-foreground">
              No products found in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product: Product, i) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  title: product.title,
                  slug: product.slug,
                  price: product.base_price,
                  image: product.product_media?.[0]?.file_path || '/placeholder.svg',
                  category: activeCategory,
                  allowCustomization: product.allow_customization,
                }}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
