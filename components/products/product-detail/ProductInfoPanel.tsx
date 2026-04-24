'use client';

import { useState } from 'react';
import {
  Minus, Plus, ShoppingCart, Ruler, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShareDropdown } from '@/components/products/ShareDropdown';
import { StarRow } from '@/components/products/StarRow';
import type { Product, ProductVariant, ColorOption } from './types';

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

// ── Props ──────────────────────────────────────────────────────────────────

interface ProductInfoPanelProps {
  product: Product;
  effectivePrice: number;
  comparePrice: number | null;
  discountPct: number | null;
  inStock: boolean;
  isNewArrival: boolean;
  uniqueSizes: string[];
  uniqueColors: string[];
  variants: ProductVariant[];
  selectedSize: string | null;
  selectedColor: string | null;
  selectedVariant: ProductVariant | null;
  quantity: number;
  wishlisted: boolean;
  flags: Record<string, boolean>;
  waNumber?: string;
  onSizeSelect: (size: string | null) => void;
  onColorSelect: (color: string | null) => void;
  onQuantityChange: (qty: number) => void;
  onWishlistToggle: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  cartLoading: boolean;
}

export function ProductInfoPanel({
  product,
  effectivePrice,
  comparePrice,
  discountPct,
  inStock,
  isNewArrival,
  uniqueSizes,
  uniqueColors,
  variants,
  selectedSize,
  selectedColor,
  selectedVariant,
  quantity,
  wishlisted,
  flags,
  waNumber,
  onSizeSelect,
  onColorSelect,
  onQuantityChange,
  onWishlistToggle,
  onAddToCart,
  onBuyNow,
  cartLoading,
}: ProductInfoPanelProps) {
  return (
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
                  onClick={() => onSizeSelect(selectedSize === size ? null : size)}
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
              const colorHex = product.color_options?.find(
                (co) => co.name === color
              )?.hex;
              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  disabled={soldOut}
                  onClick={() => onColorSelect(selectedColor === color ? null : color)}
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
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
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
            onClick={() => onQuantityChange(quantity + 1)}
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
            onClick={onWishlistToggle}
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
          onClick={onAddToCart}
          disabled={!inStock || cartLoading}
          className="flex-1 bg-[#8B1F2A] hover:bg-[#6d1720] text-white font-body h-11 gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartLoading ? 'Adding…' : 'Add to Cart'}
        </Button>
        <Button
          onClick={onBuyNow}
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
  );
}
