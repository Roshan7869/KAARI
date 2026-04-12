'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import {
  Minus, Plus, ShoppingCart, ZoomIn,
  Star, X, ChevronRight, Ruler, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductReviews } from '@/hooks/useProductReviews';
import { resolveProductImageUrl } from '@/lib/product-media';
import { ProductDetailSkeleton } from '@/components/ui/skeleton-loader';
import RelatedProducts from '@/components/products/RelatedProducts';
import { ReviewSummary } from '@/components/products/ReviewSummary';
import { ReviewList, ReviewSortOption } from '@/components/products/ReviewList';
import { WriteReviewModal } from '@/components/products/WriteReviewModal';
import { ReviewFormData } from '@/components/products/ReviewForm';
import { cn } from '@/lib/utils';
import { ShareDropdown } from '@/components/products/ShareDropdown';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';

// ── Accordion Panel (custom + / × icon, no shadcn dependency) ─────────────

function AccordionPanelItem({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 font-body text-sm font-medium text-[#3D0A14] hover:bg-[rgba(139,31,42,0.03)] transition-colors"
        aria-expanded={open}
      >
        {label}
        <span
          className={cn(
            'text-lg leading-none text-[#8B1F2A] transition-transform duration-300 font-light',
            open && 'rotate-45',
          )}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ProductMedia {
  file_path: string;
  alt_text: string | null;
  sort_order: number;
}

interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  stock_qty: number;
  price: number | null;
  is_default: boolean;
}

interface ColorOption {
  name: string;
  hex: string;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  compare_at_price: number | null;
  category: string | null;
  allow_customization: boolean;
  is_active: boolean;
  average_rating: number | null;
  review_count: number | null;
  sold_count: number | null;
  season_tag: string | null;
  product_type: string | null;
  color_options: ColorOption[] | null;
  created_at: string;
}

// ── Star helper ────────────────────────────────────────────────────────────

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i <= Math.round(rating)
              ? 'fill-[#D4AF7F] stroke-[#D4AF7F]'
              : 'fill-stone-200 stroke-stone-200',
          )}
        />
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string | undefined;
  const { user } = useAuth();
  const { addToCart, loading: cartLoading } = useCart();

  // Gallery
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Variants
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Cart
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  // Reviews
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('newest');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Feature flags — admin controls via /admin/settings/features
  const flags = useFeatureFlags([
    'product_trust_badges',
    'product_whatsapp_banner',
    'product_share_button',
    'product_wishlist_button',
    'product_reviews_section',
    'product_related_section',
  ]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug');
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, title, slug, description, base_price, compare_at_price,
          category, allow_customization, is_active,
          average_rating, review_count, sold_count,
          season_tag, product_type, color_options, created_at
        `)
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug,
  });

  const { data: images = [] } = useQuery<ProductMedia[]>({
    queryKey: ['product-images', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_media')
        .select('file_path, alt_text, sort_order')
        .eq('product_id', product!.id)
        .order('sort_order', { ascending: true });
      return (data ?? []) as ProductMedia[];
    },
    enabled: !!product?.id,
  });

  const { data: variants = [] } = useQuery<ProductVariant[]>({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('id, size, color, stock_qty, price, is_default')
        .eq('product_id', product!.id);
      return (data ?? []) as ProductVariant[];
    },
    enabled: !!product?.id,
  });

  const { reviews, loading: reviewsLoading } = useProductReviews(product?.id ?? '');

  // ── Derived values ────────────────────────────────────────────────────────

  const uniqueSizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size).filter(Boolean) as string[])),
    [variants],
  );

  const uniqueColors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color).filter(Boolean) as string[])),
    [variants],
  );

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return (
      variants.find(
        (v) =>
          (uniqueSizes.length === 0 || v.size === selectedSize) &&
          (uniqueColors.length === 0 || v.color === selectedColor),
      ) ?? null
    );
  }, [variants, selectedSize, selectedColor, uniqueSizes.length, uniqueColors.length]);

  const inStock = useMemo(() => {
    if (variants.length === 0) return product?.is_active ?? true;
    if (selectedVariant) return (selectedVariant.stock_qty ?? 0) > 0;
    return variants.some((v) => (v.stock_qty ?? 0) > 0);
  }, [variants, selectedVariant, product?.is_active]);

  const effectivePrice = selectedVariant?.price ?? product?.base_price ?? 0;
  const comparePrice = product?.compare_at_price ?? null;
  const discountPct =
    comparePrice && comparePrice > effectivePrice
      ? Math.round(((comparePrice - effectivePrice) / comparePrice) * 100)
      : null;

  const isNewArrival = product
    ? (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;

  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.round(r.rating);
      if (rounded >= 1 && rounded <= 5) dist[rounded]++;
    });
    return dist as { 5: number; 4: number; 3: number; 2: number; 1: number };
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    switch (reviewSort) {
      case 'highest': return [...reviews].sort((a, b) => b.rating - a.rating);
      case 'lowest':  return [...reviews].sort((a, b) => a.rating - b.rating);
      case 'helpful': return [...reviews].sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0));
      default:        return [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [reviews, reviewSort]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) { router.push(`/login?redirect=/products/${slug}`); return; }
    await addToCart({
      productId: product.id,
      quantity,
      variantId: selectedVariant?.id,
      title: product.title,
      itemType: 'standard',
      unitPrice: effectivePrice,
    });
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!user) { router.push(`/login?redirect=/products/${slug}`); return; }
    await addToCart({
      productId: product.id,
      quantity,
      variantId: selectedVariant?.id,
      title: product.title,
      itemType: 'standard',
      unitPrice: effectivePrice,
    });
    router.push('/checkout');
  };

  const handleReviewSubmit = async (data: ReviewFormData) => {
    if (!product) return;
    setIsSubmittingReview(true);
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, rating: data.rating, content: data.content }),
      });
      setShowReviewModal(false);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ── Early returns ─────────────────────────────────────────────────────────

  if (isLoading || !slug) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="font-display text-2xl">Product Not Found</h2>
          <p className="font-body text-muted-foreground">{"This product doesn't exist or has been removed."}</p>
          <Link href="/products"><Button>Browse Products</Button></Link>
        </div>
      </div>
    );
  }

  const primaryImage = images[selectedImageIdx] ?? images[0];
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#f9f4ef' }}>

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="border-b bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-1.5 font-body text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
            {product.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                <Link
                  href={`/products?category=${encodeURIComponent(product.category)}`}
                  className="hover:text-foreground transition-colors capitalize"
                >
                  {product.category}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-[#8B1F2A] font-medium truncate max-w-[200px]">{product.title}</span>
          </nav>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ── LEFT: Gallery ─────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 space-y-3 self-start">
            {/* Main image */}
            <div
              className="aspect-[4/5] rounded-sm overflow-hidden bg-stone-100 relative group cursor-zoom-in"
              onClick={() => setZoomOpen(true)}
            >
              {primaryImage?.file_path ? (
                <Image
                  src={resolveProductImageUrl(primaryImage.file_path)}
                  alt={primaryImage.alt_text ?? product.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No image available
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setZoomOpen(true); }}
                className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Zoom image"
              >
                <ZoomIn className="w-4 h-4 text-stone-600" />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={cn(
                      'flex-shrink-0 w-[70px] h-[70px] rounded-sm overflow-hidden bg-stone-100 border-2 transition-all',
                      idx === selectedImageIdx
                        ? 'border-[#8B1F2A] ring-1 ring-[#8B1F2A]/30'
                        : 'border-transparent hover:border-stone-300',
                    )}
                  >
                    <Image
                      src={resolveProductImageUrl(img.file_path)}
                      alt={img.alt_text ?? `${product.title} ${idx + 1}`}
                      width={70}
                      height={70}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Info ───────────────────────────────────── */}
          <div className="space-y-5">

            {/* Badge pills */}
            <div className="flex flex-wrap gap-2">
              {isNewArrival && (
                <span className="px-3 py-1 rounded-full text-xs font-body font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✦ New Arrival
                </span>
              )}
              {product.product_type === 'customized' && (
                <span className="px-3 py-1 rounded-full text-xs font-body font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Made to Order
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-body font-medium bg-[#8B1F2A]/5 text-[#8B1F2A] border border-[#8B1F2A]/20">
                ❋ Handmade
              </span>
            </div>

            {/* Category · Season tag eyebrow */}
            {(product.category || product.season_tag) && (
              <p className="font-body text-xs text-muted-foreground tracking-widest uppercase">
                {[product.category, product.season_tag].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Title + share */}
            <div className="flex items-start justify-between gap-3">
              <h1
                className="font-display text-foreground leading-tight"
                style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
              >
                {product.title}
              </h1>
              {flags['product_share_button'] && (
                <ShareDropdown title={product.title} className="flex-shrink-0 mt-1" />
              )}
            </div>

            {/* Rating row */}
            {(product.average_rating ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <StarRow rating={product.average_rating!} size="md" />
                <span className="font-body text-sm text-muted-foreground">
                  {product.average_rating?.toFixed(1)}
                </span>
                <a href="#reviews" className="font-body text-sm text-[#8B1F2A] hover:underline">
                  {(product.review_count ?? 0).toLocaleString()} reviews
                </a>
                {(product.sold_count ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-body bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ {product.sold_count!.toLocaleString()} sold
                  </span>
                )}
              </div>
            )}

            {/* Price block */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-3xl text-[#8B1F2A]">
                ₹{effectivePrice.toLocaleString('en-IN')}
              </span>
              {comparePrice && (
                <span className="font-body text-lg text-muted-foreground line-through">
                  ₹{comparePrice.toLocaleString('en-IN')}
                </span>
              )}
              {discountPct && (
                <span className="px-2 py-0.5 rounded-full text-xs font-body font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {discountPct}% off
                </span>
              )}
            </div>

            {/* Size selector */}
            {uniqueSizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm font-medium text-foreground">
                    Size{selectedSize ? ` — ${selectedSize}` : ''}
                  </p>
                  <button type="button" className="flex items-center gap-1 font-body text-xs text-[#8B1F2A] hover:underline">
                    <Ruler className="w-3 h-3" />
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => {
                    const variantForSize = variants.find((v) => v.size === size);
                    const soldOut = variantForSize ? (variantForSize.stock_qty ?? 0) === 0 : false;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={soldOut}
                        onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                        className={cn(
                          'px-4 py-1.5 rounded-sm border font-body text-sm transition-all',
                          soldOut
                            ? 'opacity-40 cursor-not-allowed line-through border-stone-200 text-stone-400'
                            : selectedSize === size
                            ? 'border-[#8B1F2A] bg-[#8B1F2A] text-white'
                            : 'border-stone-300 text-foreground hover:border-[#8B1F2A]',
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color swatches */}
            {uniqueColors.length > 0 && (
              <div className="space-y-2">
                <p className="font-body text-sm font-medium text-foreground">
                  Color{selectedColor ? ` — ${selectedColor}` : ''}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {uniqueColors.map((color) => {
                    const variantForColor = variants.find((v) => v.color === color);
                    const soldOut = variantForColor ? (variantForColor.stock_qty ?? 0) === 0 : false;
                    // Use hex value from color_options if available, otherwise fall back to color name
                    const colorHex = product?.color_options?.find(
                      (co) => co.name === color
                    )?.hex;
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        disabled={soldOut}
                        onClick={() => setSelectedColor(selectedColor === color ? null : color)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1F2A]',
                          soldOut
                            ? 'opacity-40 cursor-not-allowed'
                            : selectedColor === color
                            ? 'border-[#8B1F2A] ring-2 ring-[#8B1F2A]/30 scale-110'
                            : 'border-stone-300 hover:border-stone-500 hover:scale-105',
                        )}
                        style={{ backgroundColor: colorHex || color }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Out-of-stock notice */}
            {!inStock && (
              <p className="font-body text-sm text-red-500 font-medium">✗ Currently out of stock</p>
            )}

            {/* Qty stepper + wishlist */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-stone-300 rounded-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 hover:bg-stone-100 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-body text-sm font-medium min-w-[2.5rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 hover:bg-stone-100 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {flags['product_wishlist_button'] && (
              <button
                type="button"
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                onClick={() => setWishlisted((w) => !w)}
                className="p-2.5 border border-stone-300 rounded-sm hover:border-[#8B1F2A] transition-colors"
              >
                <Heart
                  className={cn(
                    'w-5 h-5 transition-colors',
                    wishlisted ? 'fill-[#8B1F2A] stroke-[#8B1F2A]' : 'stroke-stone-500',
                  )}
                />
              </button>
              )}
            </div>

            {/* Add to Cart + Buy Now */}
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={!inStock || cartLoading}
                className="flex-1 bg-[#8B1F2A] hover:bg-[#6d1720] text-white font-body h-11 gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartLoading ? 'Adding…' : 'Add to Cart'}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={!inStock || cartLoading}
                variant="outline"
                className="flex-1 border-[#8B1F2A] text-[#8B1F2A] hover:bg-[#8B1F2A] hover:text-white font-body h-11 transition-colors"
              >
                Buy Now
              </Button>
            </div>

            {/* Trust badges strip — 3-col grid */}
            {flags['product_trust_badges'] && (
            <div className="mt-1 grid grid-cols-3 gap-2 border border-[rgba(139,31,42,0.1)] rounded-sm py-3">
              {[
                { icon: '🧶', label: '100% Handmade', sub: 'With love' },
                { icon: '🚚', label: 'Free Ship ₹999+', sub: 'Pan India' },
                { icon: '🔒', label: 'Secure UPI', sub: 'Safe checkout' },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center px-2">
                  <span className="text-xl mb-1">{icon}</span>
                  <p className="font-body text-[10px] font-semibold text-[#3D0A14] leading-tight">{label}</p>
                  <p className="font-body text-[9px] text-[#8B1F2A]/60">{sub}</p>
                </div>
              ))}
            </div>
            )}

            {/* WhatsApp banner */}
            {flags['product_whatsapp_banner'] && waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-sm bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div className="flex-1">
                  <p className="font-body text-sm font-medium text-emerald-800">Want a custom colour or size?</p>
                  <p className="font-body text-xs text-emerald-600">Chat with us on WhatsApp</p>
                </div>
                <span className="font-body text-sm font-semibold text-emerald-700 flex-shrink-0">Chat Now →</span>
              </a>
            )}

            {/* Accordion — custom + / × icon */}
            <div className="border border-[rgba(139,31,42,0.12)] rounded-sm overflow-hidden divide-y divide-[rgba(139,31,42,0.08)]">
              {[
                {
                  id: 'details',
                  label: 'Product Details',
                  content: (
                    <p className="font-body text-sm text-[#5a0f18]/70 leading-relaxed whitespace-pre-line">
                      {product.description || 'No additional details available.'}
                    </p>
                  ),
                },
                {
                  id: 'sizing',
                  label: 'Sizing & Measurements',
                  content: (
                    <p className="font-body text-sm text-[#5a0f18]/70 leading-relaxed">
                      All measurements are approximate and may vary ±1–2 cm. For custom sizing, please reach out via WhatsApp. Size charts are listed under each product variant where applicable.
                    </p>
                  ),
                },
                {
                  id: 'shipping',
                  label: 'Shipping & Delivery',
                  content: (
                    <ul className="font-body text-sm text-[#5a0f18]/70 space-y-1.5 list-disc list-inside">
                      <li>Standard delivery: 5–7 business days across India</li>
                      <li>Express delivery: 2–3 business days (select cities)</li>
                      <li>Made-to-order items: 7–12 business days before dispatch</li>
                      <li>Tracking link shared via SMS &amp; email after dispatch</li>
                    </ul>
                  ),
                },
                {
                  id: 'returns',
                  label: 'Returns & Refunds',
                  content: (
                    <ul className="font-body text-sm text-[#5a0f18]/70 space-y-1.5 list-disc list-inside">
                      <li>7-day hassle-free return policy</li>
                      <li>Item must be unused and in original packaging</li>
                      <li>Custom / made-to-order items are non-returnable</li>
                      <li>Refunds processed within 5–7 business days</li>
                    </ul>
                  ),
                },
              ].map(({ id, label, content }) => (
                <AccordionPanelItem key={id} label={label}>{content}</AccordionPanelItem>
              ))}
            </div>
          </div>
        </div>

        {/* ── Reviews ─────────────────────────────────────────────────────── */}
        {flags['product_reviews_section'] && (
        <section id="reviews" className="mt-16 pt-12 border-t">
          <div className="max-w-4xl">
            <h2 className="font-display text-2xl text-foreground mb-8">Customer Reviews</h2>

            {!reviewsLoading && reviews.length > 0 && (
              <ReviewSummary
                averageRating={product.average_rating ?? 0}
                totalReviews={reviews.length}
                ratingDistribution={ratingDistribution}
                onWriteReview={() => {
                  if (!user) { router.push(`/login?redirect=/products/${slug}`); return; }
                  setShowReviewModal(true);
                }}
                canWriteReview={!!user}
                className="mb-8"
              />
            )}

            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-sm bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="font-body text-muted-foreground">No reviews yet. Be the first to review!</p>
                {user && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewModal(true)}
                    className="border-[#8B1F2A] text-[#8B1F2A] hover:bg-[#8B1F2A] hover:text-white"
                  >
                    Write a Review
                  </Button>
                )}
              </div>
            ) : (
              <ReviewList
                productId={product.id}
                reviews={sortedReviews.map((r) => ({
                  id: r.id,
                  userId: '',
                  userName: r.user_name,
                  userAvatar: r.user_avatar,
                  rating: r.rating,
                  title: r.title,
                  content: r.content,
                  createdAt: r.created_at,
                  helpfulCount: r.helpful_count ?? 0,
                  isVerifiedPurchase: r.is_verified_purchase ?? false,
                }))}
                sortBy={reviewSort}
                onSortChange={setReviewSort}
                currentUserId={user?.id ?? null}
              />
            )}
          </div>
        </section>
        )}
      </div>

      {/* ── Related Products ─────────────────────────────────────────────── */}
      {flags['product_related_section'] && <RelatedProducts currentProductId={product.id} category={product.category ?? ''} />}

      {/* ── Zoom lightbox ────────────────────────────────────────────────── */}
      {zoomOpen && primaryImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setZoomOpen(false)}
        >
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={resolveProductImageUrl(primaryImage.file_path)}
              alt={primaryImage.alt_text ?? product.title}
              width={900}
              height={1125}
              className="object-contain max-h-[85vh] rounded-sm"
            />
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow"
              aria-label="Close zoom"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Write Review Modal ───────────────────────────────────────────── */}
      <WriteReviewModal
        productId={product.id}
        productName={product.title}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmit}
        isSubmitting={isSubmittingReview}
      />
    </div>
  );
}

