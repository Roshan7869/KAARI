'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import {
  getGuestCart,
  addToGuestCart,
  updateGuestCartQuantity as updateGuestCartQty,
  removeFromGuestCart,
  clearGuestCart as clearGuestCartStorage,
  mergeGuestCartToServer,
  type GuestCartItem,
} from '@/lib/guest-cart';

export interface CartCustomization {
  message: string;
  preferredSize?: string;
  preferredColor?: string;
  preferredMaterial?: string;
  deliveryDeadline?: string;
  budgetMin?: number;
  budgetMax?: number;
  quoteStatus: 'not_needed' | 'pending' | 'approved' | 'rejected';
  requiresManualReview: boolean;
  uploads: Array<{
    id: string;
    filePath: string;
    previewUrl?: string;
  }>;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  variantId?: string;
  title: string;
  image?: string;
  variantSize?: string;
  variantColor?: string;
  variantMaterial?: string;
  itemType: 'standard' | 'customized';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization?: CartCustomization;
}

export interface Cart {
  cartId: string;
  userId: string;
  currency: string;
  items: CartItem[];
  pricing: {
    subtotal: number;
    shipping: number;
    tax: number;
    cgst: number;
    sgst: number;
    total: number;
  };
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiItemToCartItem(item: Record<string, any>): CartItem {
  const customization = item.cart_item_customizations;

  // Extract primary product image from joined product_media
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const media = item.products?.product_media as Array<Record<string, any>> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryMedia = media?.find((m: Record<string, any>) => m.is_primary) || media?.[0];
  const image = primaryMedia?.file_path || undefined;

  // Extract variant details from joined variants data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = item.variants as Record<string, any> | null | undefined;
  const variantSize = variant?.size || undefined;
  const variantColor = variant?.color || undefined;
  const variantMaterial = variant?.material || undefined;

  return {
    cartItemId: item.id,
    productId: item.product_id,
    variantId: item.variant_id || undefined,
    title: item.products?.title || 'Unknown Product',
    image,
    variantSize,
    variantColor,
    variantMaterial,
    itemType: (item.item_type as 'standard' | 'customized') || 'standard',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: item.line_total,
    customization: customization
      ? {
          message: customization.customization_message,
          preferredSize: customization.preferred_size || undefined,
          preferredColor: customization.preferred_color || undefined,
          preferredMaterial: customization.preferred_material || undefined,
          deliveryDeadline: customization.delivery_deadline || undefined,
          budgetMin: customization.budget_min || undefined,
          budgetMax: customization.budget_max || undefined,
          quoteStatus: customization.quote_status || 'not_needed',
          requiresManualReview: customization.requires_manual_review,
          uploads: (customization.customization_uploads || []).map((u: Record<string, string>) => ({
            id: u.id,
            filePath: u.file_path,
            previewUrl: u.preview_url || (u.file_path?.startsWith('http') ? u.file_path : undefined),
          })),
        }
      : undefined,
  };
}

/** Convert a GuestCartItem to a CartItem for local display */
function guestItemToCartItem(item: GuestCartItem, idx: number): CartItem {
  return {
    cartItemId: `guest-${idx}`,
    productId: item.productId,
    variantId: item.variantId,
    title: item.title,
    image: item.image,
    variantSize: item.variantSize,
    variantColor: item.variantColor,
    variantMaterial: item.variantMaterial,
    itemType: item.itemType,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.unitPrice * item.quantity,
    customization: item.customization
      ? {
          message: item.customization.message,
          preferredSize: item.customization.preferredSize,
          preferredColor: item.customization.preferredColor,
          preferredMaterial: item.customization.preferredMaterial,
          deliveryDeadline: item.customization.deliveryDeadline,
          budgetMin: item.customization.budgetMin,
          budgetMax: item.customization.budgetMax,
          quoteStatus: item.customization.quoteStatus as CartCustomization['quoteStatus'],
          requiresManualReview: item.customization.requiresManualReview,
          uploads: [],
        }
      : undefined,
  };
}

/** Calculate pricing for guest cart items */
function calculateGuestPricing(items: GuestCartItem[]) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= 999 ? 0 : subtotal > 0 ? 99 : 0;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return { subtotal, shipping, tax, cgst: Math.round(tax / 2 * 100) / 100, sgst: Math.round(tax / 2 * 100) / 100, total };
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mergeAttempted = useRef(false);

  const refreshCart = useCallback(async () => {
    if (!clerkUser) {
      // Guest mode: build cart from localStorage
      const guestItems = getGuestCart();
      if (guestItems.length === 0) {
        setCart(null);
      } else {
        const pricing = calculateGuestPricing(guestItems);
        setCart({
          cartId: 'guest',
          userId: 'guest',
          currency: 'INR',
          items: guestItems.map((item, idx) => guestItemToCartItem(item, idx)),
          pricing,
        });
      }
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/cart');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load cart');

      const { cart: rawCart, items, subtotal, shipping, tax, cgst, sgst, total } = json.data;

      setCart({
        cartId: rawCart.id,
        userId: clerkUser.id,
        currency: 'INR',
        items: (items || []).map(mapApiItemToCartItem),
        pricing: {
          subtotal,
          shipping,
          tax,
          cgst: cgst ?? tax / 2,
          sgst: sgst ?? tax / 2,
          total,
        },
      });
    } catch (err) {
      console.error('Cart refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [clerkUser]);

  // Refresh when Clerk auth state changes, and merge guest cart on login
  useEffect(() => {
    if (!isLoaded) return;

    const userId = clerkUser?.id;
    // Merge guest cart on first login detection
    if (userId && !mergeAttempted.current) {
      mergeAttempted.current = true;
      mergeGuestCartToServer().then((mergedCount) => {
        if (mergedCount > 0) {
          toast.success(`${mergedCount} item${mergedCount > 1 ? 's' : ''} merged from your guest cart`);
        }
        refreshCart();
      }).catch(() => {
        // Merge failed silently — still refresh server cart
        refreshCart();
      });
    } else {
      refreshCart();
    }
  }, [isLoaded, clerkUser?.id, refreshCart]);

  // Reset merge flag when user logs out
  useEffect(() => {
    if (!clerkUser) {
      mergeAttempted.current = false;
    }
  }, [clerkUser]);

  const addToCart = async (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => {
    try {
      // Guest mode: store in localStorage
      if (!clerkUser) {
        const guestItem: GuestCartItem = {
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          image: item.image,
          variantSize: item.variantSize,
          variantColor: item.variantColor,
          variantMaterial: item.variantMaterial,
          itemType: item.itemType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customization: item.customization
            ? {
                message: item.customization.message,
                preferredSize: item.customization.preferredSize,
                preferredColor: item.customization.preferredColor,
                preferredMaterial: item.customization.preferredMaterial,
                deliveryDeadline: item.customization.deliveryDeadline,
                budgetMin: item.customization.budgetMin,
                budgetMax: item.customization.budgetMax,
                quoteStatus: item.customization.quoteStatus,
                requiresManualReview: item.customization.requiresManualReview,
              }
            : undefined,
        };
        addToGuestCart(guestItem);
        // Refresh local cart state
        const guestItems = getGuestCart();
        const pricing = calculateGuestPricing(guestItems);
        setCart({
          cartId: 'guest',
          userId: 'guest',
          currency: 'INR',
          items: guestItems.map((gi, idx) => guestItemToCartItem(gi, idx)),
          pricing,
        });
        toast.success('Added to cart');
        trackEvent('add_to_cart', {
          item_id: item.productId,
          item_name: item.title,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: 'INR',
        });
        return;
      }

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
          customization: item.customization
            ? {
                message: item.customization.message,
                preferredSize: item.customization.preferredSize,
                preferredColor: item.customization.preferredColor,
                preferredMaterial: item.customization.preferredMaterial,
                deliveryDeadline: item.customization.deliveryDeadline,
                budgetMin: item.customization.budgetMin,
                budgetMax: item.customization.budgetMax,
                quoteStatus: item.customization.quoteStatus,
                requiresManualReview: item.customization.requiresManualReview,
              }
            : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to add to cart');

      await refreshCart();
      toast.success('Added to cart');
      trackEvent('add_to_cart', {
        item_id: item.productId,
        item_name: item.title,
        price: item.unitPrice,
        quantity: item.quantity,
        currency: 'INR',
      });
    } catch (err) {
      console.error('Add to cart error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add to cart');
      throw err;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      // Guest mode: update in localStorage
      if (!clerkUser) {
        // cartItemId in guest mode is "guest-{idx}", extract productId/variantId from cart state
        const item = cart?.items.find((i) => i.cartItemId === cartItemId);
        if (!item) throw new Error('Item not found');
        updateGuestCartQty(item.productId, item.variantId, quantity);
        const guestItems = getGuestCart();
        const pricing = calculateGuestPricing(guestItems);
        setCart({
          cartId: 'guest',
          userId: 'guest',
          currency: 'INR',
          items: guestItems.map((gi, idx) => guestItemToCartItem(gi, idx)),
          pricing,
        });
        toast.success('Cart updated');
        return;
      }

      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update quantity');

      await refreshCart();
      toast.success('Cart updated');
    } catch (err) {
      console.error('Update quantity error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update quantity');
      throw err;
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      // Guest mode: remove from localStorage
      if (!clerkUser) {
        const item = cart?.items.find((i) => i.cartItemId === cartItemId);
        if (!item) throw new Error('Item not found');
        removeFromGuestCart(item.productId, item.variantId);
        const guestItems = getGuestCart();
        if (guestItems.length === 0) {
          setCart(null);
        } else {
          const pricing = calculateGuestPricing(guestItems);
          setCart({
            cartId: 'guest',
            userId: 'guest',
            currency: 'INR',
            items: guestItems.map((gi, idx) => guestItemToCartItem(gi, idx)),
            pricing,
          });
        }
        toast.success('Item removed');
        return;
      }

      const res = await fetch(`/api/cart/items/${cartItemId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to remove item');

      await refreshCart();
      toast.success('Item removed');
    } catch (err) {
      console.error('Remove item error:', err);
      toast.error('Failed to remove item');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      // Guest mode: clear localStorage
      if (!clerkUser) {
        clearGuestCartStorage();
        setCart(null);
        toast.success('Cart cleared');
        return;
      }

      if (!cart) return;
      const res = await fetch('/api/cart', { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to clear cart');

      await refreshCart();
      toast.success('Cart cleared');
    } catch (err) {
      console.error('Clear cart error:', err);
      toast.error('Failed to clear cart');
      throw err;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
