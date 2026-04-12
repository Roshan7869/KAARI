'use client'
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProductCard, { type GridProduct } from './ProductCard';
import FilterDrawer, { type FilterState } from './FilterDrawer';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';
import { supabase } from '@/lib/supabase/client';
import { resolveProductImageUrl } from '@/lib/product-media';
import Image from 'next/image';

type Category = 'All' | 'Crochet Handbags' | 'Crochet Hair Accessories' | 'Crochet Dolls' | 'Crochet Keychains' | 'Crochet Bouquet';
type SortOption = 'featured' | 'newest' | 'most_popular' | 'best_rated' | 'price_low_high' | 'price_high_low' | 'name_az';
type ViewMode = 'grid' | 'list';

const DB_CATEGORIES: Category[] = ['All', 'Crochet Handbags', 'Crochet Hair Accessories', 'Crochet Dolls', 'Crochet Keychains', 'Crochet Bouquet'];

interface DatabaseProduct extends GridProduct {
  compare_at_price?: number | null;
  average_rating?: number | null;
  review_count?: number;
  sold_count?: number;
}

interface DisplayProduct {
  id?: string;
  slug: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  image: string;
  category: string;
  allowCustomization?: boolean;
  average_rating?: number | null;
  review_count?: number;
  sold_count?: number;
  badge?: GridProduct['badge'];
  rating?: number;
}

const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 5000;

const DEFAULT_DRAWER_FILTERS: FilterState = {
  minPrice: DEFAULT_MIN_PRICE,
  maxPrice: DEFAULT_MAX_PRICE,
  categories: [],
  availability: [],
  minRating: 0,
  customizableOnly: false,
};

export default function ProductGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise state from URL params
  const [active, setActive] = useState<Category>(() => {
    const cat = searchParams.get('cat');
    return (DB_CATEGORIES.includes(cat as Category) ? cat : 'All') as Category;
  });
  const [sortBy, setSortBy] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) ?? 'featured'
  );
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<FilterState>(DEFAULT_DRAWER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_DRAWER_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const search = searchParams.get('search') ?? '';
  const pageSize = 9;

  // Sync state → URL (replace, no scroll)
  useEffect(() => {
    const params = new URLSearchParams();
    if (active !== 'All') params.set('cat', active);
    if (sortBy !== 'featured') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));
    if (search) params.set('search', search);

    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  }, [active, search, sortBy, page, router]);

  const { data: dbProducts = [], isLoading } = useQuery<DatabaseProduct[]>({
    queryKey: ['products', active],
    enabled: true,
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          category,
          base_price,
          compare_at_price,
          allow_customization,
          is_active,
          average_rating,
          review_count,
          sold_count,
          product_type,
          created_at,
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

      return (data || []).map((p) => {
        const createdDaysAgo = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
        const badge: GridProduct['badge'] =
          (p.sold_count ?? 0) === 0 && !p.is_active ? 'sold_out'
          : p.product_type === 'customized' ? 'custom'
          : createdDaysAgo < 30 ? 'new'
          : null;
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          price: p.base_price,
          compare_at_price: p.compare_at_price,
          image: resolveProductImageUrl(p.product_media?.[0]?.file_path),
          category: p.category || 'Uncategorized',
          allowCustomization: p.allow_customization,
          average_rating: p.average_rating,
          review_count: p.review_count ?? 0,
          sold_count: p.sold_count ?? 0,
          badge,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  const products: DisplayProduct[] = dbProducts;

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Search filter (from URL param or SearchModal)
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    // Applied drawer filters
    if (appliedFilters.maxPrice < DEFAULT_MAX_PRICE)
      filtered = filtered.filter((p) => p.price <= appliedFilters.maxPrice);
    if (appliedFilters.minPrice > DEFAULT_MIN_PRICE)
      filtered = filtered.filter((p) => p.price >= appliedFilters.minPrice);
    if (appliedFilters.minRating > 0)
      filtered = filtered.filter((p) => (p.average_rating ?? 0) >= appliedFilters.minRating);
    if (appliedFilters.customizableOnly)
      filtered = filtered.filter((p) => p.allowCustomization);
    if (appliedFilters.availability.length > 0) {
      filtered = filtered.filter((p) => {
        if (appliedFilters.availability.includes('in_stock')) return true;
        return false;
      });
    }

    if (sortBy === 'price_low_high') return [...filtered].sort((a, b) => a.price - b.price);
    if (sortBy === 'price_high_low') return [...filtered].sort((a, b) => b.price - a.price);
    if (sortBy === 'name_az') return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'most_popular') return [...filtered].sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0));
    if (sortBy === 'best_rated') return [...filtered].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));

    return filtered;
  }, [products, search, sortBy, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedProducts.length / pageSize));
  const paginatedProducts = filteredAndSortedProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => { setPage(1); }, [active, sortBy, appliedFilters]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const drawerActiveCount = [
    appliedFilters.minPrice > DEFAULT_MIN_PRICE,
    appliedFilters.maxPrice < DEFAULT_MAX_PRICE,
    appliedFilters.categories.length > 0,
    appliedFilters.availability.length > 0,
    appliedFilters.minRating > 0,
    appliedFilters.customizableOnly,
  ].filter(Boolean).length;

  const handleReset = useCallback(() => {
    setActive('All');
    setSortBy('featured');
    setDrawerFilters(DEFAULT_DRAWER_FILTERS);
    setAppliedFilters(DEFAULT_DRAWER_FILTERS);
    setPage(1);
  }, []);

  return (
    <>
      {/* Filter Drawer */}
      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={drawerFilters}
        onChange={setDrawerFilters}
        onApply={() => setAppliedFilters(drawerFilters)}
        onReset={() => {
          setDrawerFilters(DEFAULT_DRAWER_FILTERS);
          setAppliedFilters(DEFAULT_DRAWER_FILTERS);
        }}
        allCategories={DB_CATEGORIES.filter((c) => c !== 'All')}
      />

      {/* Shop Hero Banner */}
      <section
        className="relative py-20 md:py-28 overflow-hidden"
        style={{ background: '#3D0A14' }}
      >
        {/* Diamond tile SVG pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.05 }}
          aria-hidden="true"
        >
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diamonds" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#D4AF37" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diamonds)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Tag pill */}
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full font-body text-xs tracking-[0.25em] uppercase text-amber-300 border border-amber-300/60">
            Unique Handmade Crochet
          </span>

          <h1 className="font-display text-4xl md:text-6xl text-white mb-4">
            Shop{' '}
            <span style={{ color: '#D4AF7F' }}>
              {active === 'All' ? 'All' : active}
            </span>{' '}
            Products
          </h1>

          <p
            className="text-white/70 text-base md:text-lg max-w-lg mx-auto"
            style={{ fontFamily: "'Noto Serif Devanagari', 'Cormorant Garamond', serif" }}
          >
            प्यार से बुनी गई &middot; Crafted with Love &middot; Made to Order
          </p>
        </div>
      </section>

      {/* Sticky filter bar — order: [Filters] [cat pills] [Sort] [View toggle] */}
      <div className="sticky top-[60px] z-[90] border-b border-[rgba(139,31,42,0.1)]" style={{ background: '#fdf0ec' }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Filters button — leftmost per design */}
            <button
              onClick={() => {
                setDrawerFilters(appliedFilters);
                setDrawerOpen(true);
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border rounded-md font-body text-xs transition-all ${
                drawerActiveCount > 0
                  ? 'bg-[#8B1F2A] text-white border-[#8B1F2A]'
                  : 'border-[rgba(139,31,42,0.3)] text-[#8B1F2A] hover:border-[#8B1F2A]'
              }`}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={14} aria-hidden />
              Filters
              {drawerActiveCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-white text-[#8B1F2A] rounded-full text-[9px] font-bold">
                  {drawerActiveCount}
                </span>
              )}
            </button>

            {/* Scrollable category pills — centre flex-1 */}
            <div className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide">
              {DB_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat as Category)}
                  className={`flex-shrink-0 px-4 py-1.5 font-body text-xs tracking-[0.12em] uppercase border rounded-full transition-all duration-200 ${
                    active === cat
                      ? 'bg-[#8B1F2A] text-white border-[#8B1F2A]'
                      : 'bg-transparent text-[#5a0f18]/70 border-[rgba(139,31,42,0.25)] hover:border-[#8B1F2A] hover:text-[#8B1F2A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort — rightmost */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-shrink-0 px-3 py-2 bg-transparent border border-[rgba(139,31,42,0.25)] rounded-md font-body text-xs text-[#5a0f18] hover:border-[#8B1F2A] transition-colors"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="most_popular">Most Popular</option>
              <option value="best_rated">Best Rated</option>
              <option value="price_low_high">Price: Low → High</option>
              <option value="price_high_low">Price: High → Low</option>
              <option value="name_az">Name: A → Z</option>
            </select>

            {/* View toggle */}
            <div className="flex-shrink-0 flex border border-[rgba(139,31,42,0.25)] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#8B1F2A] text-white'
                    : 'hover:bg-[rgba(139,31,42,0.08)] text-[#5a0f18]'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 transition-colors border-l border-[rgba(139,31,42,0.25)] ${
                  viewMode === 'list'
                    ? 'bg-[#8B1F2A] text-white'
                    : 'hover:bg-[rgba(139,31,42,0.08)] text-[#5a0f18]'
                }`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products area */}
      <section className="py-12 bg-gradient-warm">
        <div className="max-w-7xl mx-auto px-6">
          {/* Result count */}
          {!isLoading && (
            <p className="font-body text-xs text-muted-foreground mb-6">
              Showing <strong>{filteredAndSortedProducts.length}</strong> product{filteredAndSortedProducts.length !== 1 ? 's' : ''}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-2xl text-muted-foreground mb-4">No products found</p>
              {(search || drawerActiveCount > 0) && (
                <button
                  onClick={handleReset}
                  className="font-body text-sm text-accent hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-4">
              {paginatedProducts.map((product, i) => (
                <motion.div
                  key={product.id || product.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <a
                    href={`/products/${product.slug}`}
                    className="group flex items-center gap-5 glass-card-cream rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative w-[140px] h-[140px] flex-shrink-0 overflow-hidden">
                      <Image
                        src={product.image || '/placeholder.svg'}
                        alt={product.title}
                        width={140}
                        height={140}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 py-4 pr-5 min-w-0">
                      <p className="font-heritage text-accent text-[10px] tracking-[0.25em] uppercase mb-1">{product.category}</p>
                      <h3 className="font-display text-lg text-foreground leading-snug mb-1 truncate">{product.title}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-base text-primary font-semibold">₹{product.price.toLocaleString('en-IN')}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="font-body text-xs text-muted-foreground line-through">₹{product.compare_at_price.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
              {paginatedProducts.map((product, i) => (
                <ProductCard key={product.id || product.slug} product={product as GridProduct} index={i} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-md font-body text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 flex items-center justify-center border rounded-md font-body text-xs transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 flex items-center justify-center border border-border rounded-md font-body text-xs disabled:opacity-40 hover:bg-muted transition-colors"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
