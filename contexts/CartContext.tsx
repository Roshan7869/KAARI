'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { mergeGuestCartToServer } from '@/lib/guest-cart';
import {
  useCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} from '@/hooks/useCartQuery';
import type { Cart, CartItem } from '@/types/cart';

export type { Cart, CartItem, CartCustomization } from '@/types/cart';

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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { profileReady } = useAuth();
  const mergeAttempted = useRef(false);

  const { data: cart, isLoading, error, refetch } = useCartQuery();
  const addToCartMutation = useAddToCartMutation();
  const updateMutation = useUpdateCartItemMutation();
  const removeMutation = useRemoveCartItemMutation();
  const clearMutation = useClearCartMutation();

  // Merge guest cart on first login detection
  useEffect(() => {
    if (!isLoaded) return;
    if (!profileReady) return;

    const userId = clerkUser?.id;
    if (userId && !mergeAttempted.current) {
      mergeAttempted.current = true;
      void (async () => {
        try {
          const mergedCount = await mergeGuestCartToServer();
          if (mergedCount > 0) {
            toast.success(`${mergedCount} item${mergedCount > 1 ? 's' : ''} merged from your guest cart`);
          }
        } catch {
          // Merge failed silently — cart query will refresh anyway
        } finally {
          await refetch();
        }
      })();
    } else {
      refetch();
    }
  }, [isLoaded, profileReady, clerkUser?.id, refetch]);

  // Reset merge flag when user logs out
  useEffect(() => {
    if (!clerkUser) {
      mergeAttempted.current = false;
    }
  }, [clerkUser]);

  const addToCart = async (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => {
    await addToCartMutation.mutateAsync(item);
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    await updateMutation.mutateAsync({ cartItemId, quantity });
  };

  const removeItem = async (cartItemId: string) => {
    await removeMutation.mutateAsync(cartItemId);
  };

  const clearCart = async () => {
    await clearMutation.mutateAsync();
  };

  const refreshCart = async () => {
    await refetch();
  };

  return (
    <CartContext.Provider
      value={{
        cart: cart ?? null,
        loading: isLoading,
        error: error instanceof Error ? error.message : error ? String(error) : null,
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
