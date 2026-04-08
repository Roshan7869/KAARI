'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

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
  return {
    cartItemId: item.id,
    productId: item.product_id,
    variantId: item.variant_id || undefined,
    title: item.products?.title || 'Unknown Product',
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
          })),
        }
      : undefined,
  };
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    if (!clerkUser) {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/cart');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load cart');

      const { cart: rawCart, items, subtotal, shipping, tax, total } = json.data;

      setCart({
        cartId: rawCart.id,
        userId: clerkUser.id,
        currency: 'INR',
        items: (items || []).map(mapApiItemToCartItem),
        pricing: { subtotal, shipping, tax, total },
      });
    } catch (err) {
      console.error('Cart refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [clerkUser]);

  // Refresh when Clerk auth state changes
  useEffect(() => {
    if (isLoaded) {
      refreshCart();
    }
  }, [isLoaded, clerkUser?.id, refreshCart]);

  const addToCart = async (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => {
    try {
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
