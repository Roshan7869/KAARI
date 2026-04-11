'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Search, LayoutGrid, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProductCard, { type GridProduct } from './ProductCard';
import FilterDrawer, { type FilterState } from './FilterDrawer';
import { ProductCardSkeleton } from '@/components/ui/skeleton-loader';
import { categories, getProductsByCategory, type Category, type Product } from '@/data/products';
import { supabase } from '@/lib/supabase/client';
import { sanitizeTextInput } from '@/lib/sanitization';
import { resolveProductImageUrl } from '@/lib/product-media';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';

type SortOption = 'featured' | 'newest' | 'most_popular' | 'best_rated' | 'price_low_high' | 'price_high_low' | 'name_az';
type ViewMode = 'grid' | 'list';

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
    return (categories.includes(cat as Category) ? cat : 'All') as Category;
  });
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [sortBy, setSortBy] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) ?? 'featured'
  );
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilters, setDrawerFilters] = useState<FilterState>(DEFAULT_DRAWER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_DRAWER_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [useDatabase, setUseDatabase] = useState(false);
  const pageSize = 9;

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync state → URL (replace, no scroll)
  useEffect(() => {
    const params = new URLSearchParams();
    if (active !== 'All') params.set('cat', active);
    if (search) params.set('q', search);
    if (sortBy !== 'featured') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));

    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  }, [active, search, sortBy, page, router]);

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        setUseDatabase((count || 0) > 0);
      } catch {
        setUseDatabase(false);
      }
    };
    checkDatabase();
  }, []);

  const { data: dbProducts = [], isLoading: dbLoading } = useQuery<DatabaseProduct[]>({
    queryKey: ['products', active],
    enabled: useDatabase,
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
          : p.product_type === 'custom_request' ? 'custom'
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

  const staticFiltered = getProductsByCategory(active);
  const staticProducts: DisplayProduct[] = useMemo(
    () =>
      staticFiltered.map((product: Product) => ({
        slug: product.slug,
        title: product.name,
        price: product.price,
        image: product.images[0],
        category: product.category,
        average_rating: product.rating,
        review_count: product.reviewCount,
      })),
    [staticFiltered],
  );

  const products: DisplayProduct[] = useDatabase ? dbProducts : staticProducts;
  const isLoading = useDatabase && dbLoading;

  const filteredAndSortedProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    let filtered =
      normalizedSearch.length === 0
        ? products
        : products.filter((p) => p.title.toLowerCase().includes(normalizedSearch));

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

  useEffect(() => { setPage(1); }, [active, search, sortBy, appliedFilters]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const drawerActiveCount = [
    appliedFilters.minPrice > DEFAULT_MIN_PRICE,
    appliedFilters.maxPrice < DEFAULT_MAX_PRICE,
    appliedFilters.categories.length > 0,
    appliedFilters.availability.length > 0,
    appliedFilters.minRating > 0,
    appliedFilters.customizableOnly,
  ].filter(Boolean).length;

  // Autocomplete
  const { suggestions } = useSearchSuggestions(search);

  const handleSuggestionSelect = useCallback(
    (slug: string, type: string, title: string) => {
      if (type === 'category') {
        setActive(title as Category);
        setSearch('');
      } else {
        router.push(`/products/${slug}`);
      }
      setShowSuggestions(false);
      setActiveIndex(-1);
    },
    [router]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const s = suggestions[activeIndex];
        handleSuggestionSelect(s.slug, s.type, s.title);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    },
    [showSuggestions, suggestions, activeIndex, handleSuggestionSelect]
  );

  const handleReset = useCallback(() => {
    setActive('All');
    setSearch('');
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
        allCategories={categories.filter((c) => c !== 'All')}
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
            <span className="text-amber-300">
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

      {/* Sticky filter bar */}
      <div className="sticky top-[60px] z-[90] bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Scrollable category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide mb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat as Category)}
                className={`flex-shrink-0 px-4 py-1.5 font-body text-xs tracking-[0.12em] uppercase border rounded-full transition-all duration-200 ${
                  active === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/60 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + Sort + Filters + View row */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex-1 relative min-w-0" ref={suggestionsRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(sanitizeTextInput(e.target.value, 50));
                  setShowSuggestions(true);
                  setActiveIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products…"
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-md font-body text-sm"
                aria-label="Search products"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="search-suggestions"
                aria-autocomplete="list"
                role="combobox"
              />

              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    id="search-suggestions"
                    role="listbox"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full top-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden"
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={s.id}
                        role="option"
                        aria-selected={i === activeIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(s.slug, s.type, s.title);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                          i === activeIndex ? 'bg-accent/10' : 'hover:bg-muted'
                        } ${i > 0 ? 'border-t border-border/50' : ''}`}
                      >
                        <span className="font-body text-sm text-foreground truncate">{s.title}</span>
                        <span className="font-body text-xs text-muted-foreground ml-3 flex-shrink-0">
                          {s.type === 'product' ? `₹${s.price.toLocaleString('en-IN')}` : s.category}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-background border border-border rounded-md font-body text-xs"
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

            {/* Filters button */}
            <button
              onClick={() => {
                setDrawerFilters(appliedFilters);
                setDrawerOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-md font-body text-xs transition-all ${
                drawerActiveCount > 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/60 hover:text-foreground'
              }`}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={14} aria-hidden />
              Filters
              {drawerActiveCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-primary-foreground text-primary rounded-full text-[9px] font-bold">
                  {drawerActiveCount}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 transition-colors border-l border-border ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
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
                      <img
                        src={product.image || '/placeholder.svg'}
                        alt={product.title}
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
