import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';
import { categories, getProductsByCategory, type Category, type Product } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeTextInput } from '@/lib/sanitization';

type SortOption = 'featured' | 'price_low_high' | 'price_high_low' | 'name_az';

interface DatabaseProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  allowCustomization?: boolean;
}

interface DisplayProduct {
  id?: string;
  slug: string;
  title: string;
  price: number;
  image: string;
  category: string;
  allowCustomization?: boolean;
}

export default function ProductGrid() {
  const [active, setActive] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Lightweight check: does the database have any active products at all?
  // Cached long-term so subsequent mounts skip the request entirely.
  const { data: dbAvailable = false } = useQuery<boolean>({
    queryKey: ['products-db-check'],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return (count || 0) > 0;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour — database is unlikely to go from populated to empty
    gcTime: 1000 * 60 * 60,
  });

  const { data: dbProducts = [], isLoading: dbLoading } = useQuery<DatabaseProduct[]>({
    queryKey: ['products', active],
    enabled: dbAvailable,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          category,
          base_price,
          allow_customization,
          is_active,
          product_media (file_path)
        `)
        .eq('is_active', true);

      if (active !== 'All') {
        query = query.eq('category', active);
      }

      const { data, error } = await query.limit(120);
      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      return (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: p.base_price,
        image: p.product_media?.[0]?.file_path || '/placeholder.svg',
        category: p.category || 'Uncategorized',
        allowCustomization: p.allow_customization,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const staticFiltered = getProductsByCategory(active);

  const staticProducts: DisplayProduct[] = useMemo(
    () =>
      staticFiltered.map((product: Product) => ({
        slug: product.slug,
        title: product.name,
        price: product.price,
        image: product.images[0],
        category: product.category,
      })),
    [staticFiltered],
  );

  const products: DisplayProduct[] = dbAvailable ? dbProducts : staticProducts;
  const isLoading = dbAvailable && dbLoading;

  const filteredAndSortedProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = normalizedSearch.length === 0
      ? products
      : products.filter((product) => product.title.toLowerCase().includes(normalizedSearch));

    if (sortBy === 'price_low_high') {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_high_low') {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'name_az') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [products, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / pageSize));
  const paginatedProducts = filteredAndSortedProducts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [active, search, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat as Category)}
              className={`px-5 py-2.5 font-body text-xs tracking-[0.15em] uppercase border transition-all duration-300 rounded-sm ${
                active === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-accent hover:text-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-3 mb-8">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(sanitizeTextInput(e.target.value, 50))}
            placeholder="Search products"
            className="md:col-span-2 w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-sm"
            aria-label="Search products"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-sm"
            aria-label="Sort products"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_low_high">Price: Low to High</option>
            <option value="price_high_low">Price: High to Low</option>
            <option value="name_az">Name: A to Z</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heritage text-xl text-muted-foreground">
              No products found in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {paginatedProducts.map((product, i: number) => (
              <ProductCard key={product.id || product.slug} product={product} index={i} />
            ))}
          </div>
        )}

        {filteredAndSortedProducts.length > pageSize && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-sm font-body text-xs uppercase tracking-wide disabled:opacity-50"
            >
              Prev
            </button>
            <span className="font-body text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-border rounded-sm font-body text-xs uppercase tracking-wide disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
