'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductReviews } from '@/hooks/useProductReviews';
import { ProductDetailSkeleton } from '@/components/ui/skeleton-loader';
import RelatedProducts from '@/components/products/RelatedProducts';
import { ReviewSummary } from '@/components/products/ReviewSummary';
import { toast } from 'sonner';
import { ReviewList, ReviewSortOption } from '@/components/products/ReviewList';
import { WriteReviewModal } from '@/components/products/WriteReviewModal';
import { ReviewFormData } from '@/components/products/ReviewForm';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  ProductImageGallery,
  ProductInfoPanel,
  ProductZoomLightbox,
} from '@/components/products/product-detail';
import type {
  Product,
  ProductMedia,
  ProductVariant,
} from '@/components/products/product-detail';

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
    // Guard: require variant selection when variants exist
    if (variants.length > 0 && !selectedVariant) {
      toast.error('Please select a size/variant before adding to cart.');
      return;
    }
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
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
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
                  href={`/products?cat=${encodeURIComponent(product.category)}`}
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
          <ProductImageGallery
            images={images}
            selectedIdx={selectedImageIdx}
            onSelect={setSelectedImageIdx}
            onZoomOpen={() => setZoomOpen(true)}
            productTitle={product.title}
          />

          {/* ── RIGHT: Product Info ───────────────────────────────────── */}
          <ProductInfoPanel
            product={product}
            effectivePrice={effectivePrice}
            comparePrice={comparePrice}
            discountPct={discountPct}
            inStock={inStock}
            isNewArrival={isNewArrival}
            uniqueSizes={uniqueSizes}
            uniqueColors={uniqueColors}
            variants={variants}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            selectedVariant={selectedVariant}
            quantity={quantity}
            wishlisted={wishlisted}
            flags={flags}
            waNumber={waNumber}
            onSizeSelect={setSelectedSize}
            onColorSelect={setSelectedColor}
            onQuantityChange={setQuantity}
            onWishlistToggle={() => setWishlisted((w) => !w)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            cartLoading={cartLoading}
          />
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
      <ProductZoomLightbox
        open={zoomOpen}
        image={primaryImage}
        productTitle={product.title}
        onClose={() => setZoomOpen(false)}
      />

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
