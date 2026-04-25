import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { logger } from '@/lib/logger-client';
import { trackEvent } from '@/lib/analytics';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  getGuestCart,
  addToGuestCart,
  updateGuestCartQuantity,
  removeFromGuestCart,
  clearGuestCart,
  type GuestCartItem,
} from '@/lib/guest-cart';
import type { Cart, CartItem } from '@/types/cart';

const CART_QUERY_KEY = ['cart'] as const;

function calculateGuestPricing(items: GuestCartItem[]) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= 999 ? 0 : subtotal > 0 ? 99 : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  return { subtotal, shipping, tax: 0, cgst: 0, sgst: 0, total };
}

function guestItemToCartItem(item: GuestCartItem, idx: number): CartItem {
  const stableId = `guest-${item.productId}-${item.variantId ?? 'base'}`;
  return {
    cartItemId: stableId || `guest-${idx}`,
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
      ? (() => {
          const c = item.customization!;
          return {
            message: c.message,
            preferredSize: c.preferredSize,
            preferredColor: c.preferredColor,
            preferredMaterial: c.preferredMaterial,
            deliveryDeadline: c.deliveryDeadline,
            budgetMin: c.budgetMin,
            budgetMax: c.budgetMax,
            quoteStatus: c.quoteStatus as Exclude<CartItem['customization'], undefined>['quoteStatus'],
            requiresManualReview: c.requiresManualReview,
            uploads: [],
          };
        })()
      : undefined,
  };
}

function buildGuestCart(): Cart | null {
  const items = getGuestCart();
  if (items.length === 0) return null;
  const pricing = calculateGuestPricing(items);
  return {
    cartId: 'guest',
    userId: 'guest',
    currency: 'INR',
    items: items.map((item, idx) => guestItemToCartItem(item, idx)),
    pricing,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiItemToCartItem(item: Record<string, any>): CartItem {
  const customization = item.cart_item_customizations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const media = item.products?.product_media as Array<Record<string, any>> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryMedia = media?.find((m: Record<string, any>) => m.is_primary) || media?.[0];
  const image = primaryMedia?.file_path || undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = item.variants as Record<string, any> | null | undefined;
  return {
    cartItemId: item.id,
    productId: item.product_id,
    variantId: item.variant_id || undefined,
    title: item.products?.title || 'Unknown Product',
    image,
    variantSize: variant?.size || undefined,
    variantColor: variant?.color || undefined,
    variantMaterial: variant?.material || undefined,
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

async function fetchServerCart(): Promise<Cart | null> {
  const res = await fetch('/api/cart');
  // Non-2xx means not logged in or profile not ready — not an error, just empty cart
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;

  const { cart: rawCart, items, subtotal, shipping, total } = json.data;
  if (!rawCart) return null;

  return {
    cartId: rawCart?.id ?? '',
    userId: rawCart?.user_id ?? '',
    currency: 'INR',
    items: (items ?? []).map(mapApiItemToCartItem),
    pricing: { subtotal, shipping, tax: 0, cgst: 0, sgst: 0, total },
  };
}

export function useCartQuery() {
  const { user: clerkUser, isLoaded } = useUser();

  return useQuery({
    queryKey: [...CART_QUERY_KEY, clerkUser?.id ?? 'guest'],
    queryFn: async () => {
      if (!clerkUser) {
        return buildGuestCart();
      }
      return fetchServerCart();
    },
    enabled: isLoaded,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => {
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
        return { action: 'added' };
      }

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
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
      return json;
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Added to cart');
      trackEvent('add_to_cart', {
        item_id: item.productId,
        item_name: item.title,
        price: item.unitPrice,
        quantity: item.quantity,
        currency: 'INR',
      });
    },
    onError: (err) => {
      logger.error('Add to cart failed', err, { context: 'add-to-cart' });
      toast.error(err instanceof Error ? err.message : 'Failed to add to cart');
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      if (!clerkUser) {
        // Guest mode: cartItemId is "guest-{productId}-{variantId}", extract productId/variantId
        const match = cartItemId.match(/^guest-(.+?)-(?:base|(.+))$/);
        if (!match) throw new Error('Invalid guest cart item');
        const productId = match[1];
        const variantId = match[2] || undefined;
        updateGuestCartQuantity(productId, variantId, quantity);
        return { action: 'updated' };
      }

      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({ quantity }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update quantity');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Cart updated');
    },
    onError: (err) => {
      logger.error('Update quantity failed', err, { context: 'update-quantity' });
      toast.error(err instanceof Error ? err.message : 'Failed to update quantity');
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async (cartItemId: string) => {
      if (!clerkUser) {
        const match = cartItemId.match(/^guest-(.+?)-(?:base|(.+))$/);
        if (!match) throw new Error('Invalid guest cart item');
        const productId = match[1];
        const variantId = match[2] || undefined;
        removeFromGuestCart(productId, variantId);
        return { action: 'removed' };
      }

      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: 'DELETE',
        headers: getCsrfHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to remove item');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Item removed');
    },
    onError: (err) => {
      logger.error('Remove item failed', err, { context: 'remove-item' });
      toast.error('Failed to remove item');
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  return useMutation({
    mutationFn: async () => {
      if (!clerkUser) {
        clearGuestCart();
        return { action: 'cleared' };
      }

      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: getCsrfHeaders(),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to clear cart');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Cart cleared');
    },
    onError: (err) => {
      logger.error('Clear cart failed', err, { context: 'clear-cart' });
      toast.error('Failed to clear cart');
    },
  });
}
