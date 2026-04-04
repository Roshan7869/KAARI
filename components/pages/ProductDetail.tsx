'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, ShoppingCart, Heart, ArrowLeft } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/product-media';
import { ProductDetailSkeleton } from '@/components/ui/skeleton-loader';

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  category: string | null;
  allow_customization: boolean;
}

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string | undefined;
  const { user } = useAuth();
  const { addToCart, loading: cartLoading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          slug,
          description,
          base_price,
          category,
          allow_customization
        `)
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!slug,
  });

  // Fetch images separately
  const { data: images } = useQuery<Array<{ file_path: string; alt_text: string | null }>>({
    queryKey: ['product-images', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from('product_media')
        .select('file_path, alt_text')
        .eq('product_id', product.id)
        .order('sort_order', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Fetch variants to determine stock availability
  const { data: variants } = useQuery<Array<{ id: string; stock_qty: number }>>({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, stock_qty')
        .eq('product_id', product.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!product?.id,
  });

  const hasVariants = (variants?.length ?? 0) > 0;
  const inStock = hasVariants
    ? variants?.some((variant) => (variant.stock_qty ?? 0) > 0) ?? false
    : true;
  const primaryImageSrc = resolveProductImageUrl(images?.[0]?.file_path);

  const handleAddToCart = async () => {
    if (!product) return;

    if (!user) {
      router.push(`/login?redirect=/products/${product.slug}`);
      return;
    }

    await addToCart({
      productId: product.id,
      quantity,
      variantId: selectedVariant || undefined,
      title: product.title,
      itemType: 'standard',
      unitPrice: product.base_price,
    });
  };

  const handleBuyNow = async () => {
    if (!product) return;

    if (!user) {
      router.push(`/login?redirect=/products/${product.slug}`);
      return;
    }

    await handleAddToCart();
    router.push('/checkout');
  };

  if (isLoading || !slug) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="font-display text-2xl mb-4">Product Not Found</h2>
            <p className="font-body text-muted-foreground mb-4">
              {`This product doesn't exist or has been removed.`}
            </p>
            <Link href="/products">
              <Button>Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 font-body text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-sm relative overflow-hidden">
            {images?.[0]?.file_path ? (
              <Image
                src={primaryImageSrc}
                alt={images[0].alt_text || product.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image available
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(1).map((img, idx) => (
                <div key={idx} className="w-20 h-20 bg-muted rounded-sm flex-shrink-0">
                  <Image
                    src={resolveProductImageUrl(img.file_path)}
                    alt={img.alt_text || `${product.title} ${idx + 2}`}
                    width={80}
                    height={80}
                    className="object-cover rounded-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <p className="font-body text-sm text-muted-foreground mb-2">
                {product.category}
              </p>
            )}
            <h1 className="font-display text-3xl mb-4">{product.title}</h1>
            <p className="font-display text-2xl text-primary">
              ₹{product.base_price.toLocaleString('en-IN')}
            </p>
          </div>

          {product.description && (
            <div className="font-body text-muted-foreground">
              {product.description}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="font-body w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!inStock || cartLoading}
              className="flex-1"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {inStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>

            <Button variant="outline" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleBuyNow}
            disabled={!inStock || cartLoading}
            className="w-full"
            variant="secondary"
          >
            {inStock ? 'Buy Now' : 'Unavailable'}
          </Button>

          {product.allow_customization && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h3 className="font-display text-lg mb-2">Customize Your Order</h3>
                <p className="font-body text-sm text-muted-foreground mb-3">
                  This product can be customized. Add your preferences at checkout.
                </p>
                <Link href={`/products/${product.slug}/customize`}>
                  <Button variant="outline">Customize</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
