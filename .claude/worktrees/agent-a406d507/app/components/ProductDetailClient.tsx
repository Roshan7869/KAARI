'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ChevronLeft, Star, Shield, Truck, RefreshCw, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

type Product = Tables<'products'>;
type ProductVariant = Tables<'product_variants'>;
type ProductMedia = Tables<'product_media'>;

interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  media: ProductMedia[];
}

interface ProductDetailClientProps {
  slug: string;
}

export default function ProductDetailClient({ slug }: ProductDetailClientProps) {
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const supabase = createClient();
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            variants:product_variants(*),
            media:product_media(*)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error) throw error;

        const productData = data as ProductWithDetails;
        setProduct(productData);

        // Set default variant
        const variants = productData.variants ?? [];
        const defaultVariant = variants.find((v) => v.is_default) ?? variants[0] ?? null;
        setSelectedVariant(defaultVariant);
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant?.id,
        title: product.title,
        itemType: 'standard',
        quantity,
        unitPrice: selectedVariant?.price ?? product.base_price,
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-display text-2xl text-foreground">Product not found</p>
        <Link href="/products" className="font-body text-sm text-primary underline">
          Back to Products
        </Link>
      </div>
    );
  }

  const images = product.media?.sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const price = selectedVariant?.price ?? product.base_price;
  const stock = selectedVariant?.stock_qty ?? 0;
  const inStock = stock > 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 font-body text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <span>/</span>
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-card">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImageIndex]?.url ?? '/placeholder.svg'}
                  alt={product.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image available
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedImageIndex ? 'border-primary' : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.title} ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">{product.title}</h1>
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-accent text-accent" />
                ))}
                <span className="font-body text-sm text-muted-foreground ml-2">Handcrafted</span>
              </div>
              <p className="font-display text-3xl text-primary">₹{price.toLocaleString('en-IN')}</p>
            </div>

            {product.description && (
              <p className="font-body text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 1 && (
              <div>
                <p className="font-body text-sm font-medium text-foreground mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg font-body text-sm border transition-colors ${
                        selectedVariant?.id === variant.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {variant.sku}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <p className="font-body text-sm font-medium text-foreground mb-2">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors font-body text-lg"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="font-body text-lg w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                  disabled={!inStock}
                  className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors font-body text-lg disabled:opacity-50"
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <span className="font-body text-sm text-muted-foreground">
                  {inStock ? `${stock} available` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary text-primary-foreground font-body text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors rounded-lg"
              >
                {addingToCart ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="font-body text-xs text-muted-foreground">Handmade Quality</p>
              </div>
              <div className="text-center">
                <Truck className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="font-body text-xs text-muted-foreground">Pan India Delivery</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="font-body text-xs text-muted-foreground">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>
    </div>
  );
}
