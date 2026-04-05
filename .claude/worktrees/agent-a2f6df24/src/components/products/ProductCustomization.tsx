import { useEffect, useMemo, useState } from 'react';
import { Gift, Minus, Palette, Plus, Ruler, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface ProductCustomizationProps {
  product: Product;
}

type ProductVariantRow = Pick<Tables<'product_variants'>, 'id' | 'size' | 'color' | 'price' | 'stock_qty' | 'is_default'>;

export default function ProductCustomization({ product }: ProductCustomizationProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [customText, setCustomText] = useState('');
  const [giftPackaging, setGiftPackaging] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [dbProductId, setDbProductId] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);

  const giftPrice = 99;
  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const normalizedColor = selectedColor.trim().toLowerCase();
    const normalizedSize = selectedSize.trim().toLowerCase();

    const exact = variants.find((variant) =>
      (variant.color || '').trim().toLowerCase() === normalizedColor &&
      (variant.size || '').trim().toLowerCase() === normalizedSize,
    );
    if (exact) return exact;

    const sizeOnly = variants.find((variant) =>
      (variant.size || '').trim().toLowerCase() === normalizedSize,
    );
    if (sizeOnly) return sizeOnly;

    const colorOnly = variants.find((variant) =>
      (variant.color || '').trim().toLowerCase() === normalizedColor,
    );
    if (colorOnly) return colorOnly;

    return variants.find((variant) => variant.is_default) || variants[0];
  }, [selectedColor, selectedSize, variants]);

  const availableStock = selectedVariant?.stock_qty ?? 0;
  const unitPrice = Number(selectedVariant?.price ?? product.price) + (giftPackaging ? giftPrice : 0);
  const totalPrice = unitPrice * quantity;
  const hasCustomization = useMemo(
    () =>
      selectedColor !== product.colors[0] ||
      selectedSize !== product.sizes[0] ||
      customText.trim().length > 0 ||
      giftPackaging,
    [customText, giftPackaging, product.colors, product.sizes, selectedColor, selectedSize],
  );

  useEffect(() => {
    const resolveProductId = async () => {
      setLoadingProduct(true);
      const { data: productRow, error } = await supabase
        .from('products')
        .select('id, product_variants (id, size, color, price, stock_qty, is_default)')
        .eq('slug', product.slug)
        .eq('is_active', true)
        .order('is_default', { referencedTable: 'product_variants', ascending: false })
        .maybeSingle();

      if (error || !productRow?.id) {
        setDbProductId(null);
        setVariants([]);
      } else {
        setDbProductId(productRow.id);
        setVariants(
          (productRow.product_variants as ProductVariantRow[]) || [],
        );
      }
      setLoadingProduct(false);
    };

    resolveProductId();
  }, [product.slug]);

  useEffect(() => {
    if (availableStock <= 0) return;
    if (quantity > availableStock) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

  const handlePurchaseAction = async (buyNow: boolean) => {
    if (loadingProduct || submitting) return;

    if (!dbProductId) {
      toast.error('This product is not ready for checkout yet. Please contact support.');
      return;
    }
    if (!selectedVariant) {
      toast.error('No stock configuration found for this product.');
      return;
    }
    if (availableStock <= 0) {
      toast.error('This item is out of stock.');
      return;
    }
    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} item(s) left in stock.`);
      return;
    }

    try {
      setSubmitting(true);
      const noteParts = [
        `Color: ${selectedColor}`,
        `Size: ${selectedSize}`,
        customText.trim() ? `Personalization: ${customText.trim()}` : '',
        giftPackaging ? 'Gift packaging: Yes' : '',
      ].filter(Boolean);

      await addToCart({
        productId: dbProductId,
        title: product.name,
        variantId: selectedVariant.id,
        itemType: hasCustomization ? 'customized' : 'standard',
        quantity,
        unitPrice,
        customization: hasCustomization
          ? {
              message: noteParts.join(' | '),
              preferredColor: selectedColor,
              preferredSize: selectedSize,
              quoteStatus: 'not_needed',
              requiresManualReview: false,
              uploads: [],
            }
          : undefined,
      });

      trackEvent('add_to_cart_options', {
        item_name: product.name,
        item_id: product.slug,
        quantity,
        unit_price: unitPrice,
        value: totalPrice,
        with_customization: hasCustomization,
      });

      if (buyNow) {
        navigate('/checkout');
        return;
      }
    } catch (error) {
      const isAuthError = error instanceof Error && error.message.includes('Must be logged in');
      if (isAuthError) {
        toast.error('Please sign in first to add items to your cart.');
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Could not add this item to cart. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Color Selection */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-accent" />
          <span className="font-body text-sm font-medium text-foreground">Choose Yarn Color</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`px-4 py-2 text-xs font-body tracking-wider border rounded-sm transition-all duration-300 ${
                selectedColor === color
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-accent'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Size Options */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ruler className="w-4 h-4 text-accent" />
          <span className="font-body text-sm font-medium text-foreground">Select Size</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`px-4 py-2 text-xs font-body tracking-wider border rounded-sm transition-all duration-300 ${
                selectedSize === size
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border hover:border-accent'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Text */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-accent" />
          <span className="font-body text-sm font-medium text-foreground">Custom Name or Text</span>
        </div>
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Enter personalization text..."
          maxLength={20}
          className="w-full px-4 py-3 bg-background border border-border rounded-sm font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
        <p className="mt-1 text-xs text-muted-foreground font-body">{customText.length}/20 characters</p>
      </div>

      {/* Gift Packaging */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-accent" />
          <span className="font-body text-sm font-medium text-foreground">Add Gift Packaging</span>
        </div>
        <button
          onClick={() => setGiftPackaging(!giftPackaging)}
          className={`flex items-center gap-3 w-full px-4 py-3 border rounded-sm transition-all duration-300 ${
            giftPackaging
              ? 'bg-primary/5 border-primary'
              : 'bg-transparent border-border hover:border-accent'
          }`}
        >
          <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors ${
            giftPackaging ? 'bg-primary border-primary' : 'border-muted'
          }`}>
            {giftPackaging && <span className="text-primary-foreground text-xs">✓</span>}
          </div>
          <span className="font-body text-sm text-foreground">Premium gift wrap with handwritten note (+₹{giftPrice})</span>
        </button>
      </div>

      {/* Total Price */}
      <div className="pt-4 border-t border-border">
        <div className="flex justify-between items-center mb-4">
          <span className="font-heritage text-muted-foreground text-sm">Total Price</span>
          <div className="flex items-center gap-3">
            {selectedVariant && (
              <span className={`font-body text-xs uppercase tracking-wider px-3 py-1 rounded-sm ${
                availableStock > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {availableStock > 0 ? `${availableStock} in stock` : 'Out of Stock'}
              </span>
            )}
            <span className="font-display text-2xl text-primary font-bold">
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">Quantity</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1 || submitting}
              className="p-2 border border-border hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="min-w-[2rem] text-center font-body text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => prev + 1)}
              disabled={submitting || quantity >= availableStock}
              className="p-2 border border-border hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="add-to-cart"
            onClick={() => handlePurchaseAction(false)}
            disabled={submitting || loadingProduct || !dbProductId || !selectedVariant || availableStock <= 0}
            className="yarn-button w-full text-center py-4 bg-background text-foreground border border-border font-body text-sm tracking-[0.15em] uppercase disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add to Cart'}
          </button>
          <button
            type="button"
            onClick={() => handlePurchaseAction(true)}
            disabled={submitting || loadingProduct || !dbProductId || !selectedVariant || availableStock <= 0}
            className="yarn-button w-full text-center py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.15em] uppercase border border-kaari-gold/30 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Buy Now'}
          </button>
        </div>
        {!!selectedVariant && (
          <p className="mt-3 font-body text-xs text-muted-foreground">
            {availableStock > 5
              ? 'In Stock'
              : availableStock > 0
              ? `Only ${availableStock} left in stock`
              : 'Out of Stock'}
          </p>
        )}
        {!dbProductId && !loadingProduct && (
          <p className="mt-3 font-body text-xs text-muted-foreground">
            Checkout is unavailable for this item until it is synced to the product catalog.
          </p>
        )}
      </div>
    </div>
  );
}
