/**
 * Cart Context Mock Factory
 *
 * This module provides utilities for mocking the CartContext
 * in React component tests. It supports:
 * - useCart hook mock
 * - CartProvider mock wrapper
 * - Different cart states (empty, with items, loading)
 */

import { vi } from 'vitest';
import type { Cart, CartItem, CartCustomization } from '@/contexts/CartContext';

// ============================================
// Types
// ============================================

export interface MockCartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: ReturnType<typeof vi.fn>;
  updateQuantity: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clearCart: ReturnType<typeof vi.fn>;
  refreshCart: ReturnType<typeof vi.fn>;
}

export interface MockCartOptions {
  cart?: Partial<Cart> | null;
  loading?: boolean;
  error?: string | null;
}

// ============================================
// Default Mock Data
// ============================================

export const defaultMockCartCustomization: CartCustomization = {
  message: 'Custom message',
  preferredSize: 'medium',
  preferredColor: 'blue',
  preferredMaterial: 'cotton',
  deliveryDeadline: '2024-12-31',
  budgetMin: 1000,
  budgetMax: 2000,
  quoteStatus: 'pending',
  requiresManualReview: false,
  uploads: [],
};

export const defaultMockCartItem: CartItem = {
  cartItemId: 'test-cart-item-id',
  productId: 'test-product-id',
  variantId: 'test-variant-id',
  title: 'Test Product',
  itemType: 'standard',
  quantity: 1,
  unitPrice: 999,
  lineTotal: 999,
};

export const defaultMockCartItemWithCustomization: CartItem = {
  ...defaultMockCartItem,
  cartItemId: 'test-custom-item-id',
  itemType: 'customized',
  customization: defaultMockCartCustomization,
};

export const defaultMockCart: Cart = {
  cartId: 'test-cart-id',
  userId: 'test-user-id',
  currency: 'INR',
  items: [],
  pricing: {
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  },
};

// ============================================
// Mock Factory Functions
// ============================================

/**
 * Creates a mock cart context value for testing.
 *
 * @example
 * ```typescript
 * const cartValue = createMockCartContext();
 * vi.mock('@/contexts/CartContext', () => ({
 *   useCart: () => cartValue,
 * }));
 * ```
 */
export function createMockCartContext(
  options: MockCartOptions = {}
): MockCartContextValue {
  const { cart = null, loading = false, error = null } = options;

  // Determine cart state based on options
  const finalCart = cart === null ? null : { ...defaultMockCart, ...cart };

  return {
    cart: finalCart,
    loading,
    error,
    addToCart: vi.fn().mockResolvedValue(undefined),
    updateQuantity: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    clearCart: vi.fn().mockResolvedValue(undefined),
    refreshCart: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock cart context with items.
 */
export function createCartWithItemsContext(
  items: Partial<CartItem>[] = []
): MockCartContextValue {
  const cartItems: CartItem[] = items.map((item, index) => ({
    ...defaultMockCartItem,
    cartItemId: `test-cart-item-${index}`,
    ...item,
  }));

  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 ? 99 : 0;

  return createMockCartContext({
    cart: {
      ...defaultMockCart,
      items: cartItems,
      pricing: {
        subtotal,
        shipping,
        tax: 0,
        total: subtotal + shipping,
      },
    },
    loading: false,
  });
}

/**
 * Creates a mock cart context for an empty cart.
 */
export function createEmptyCartContext(): MockCartContextValue {
  return createMockCartContext({
    cart: defaultMockCart,
    loading: false,
  });
}

/**
 * Creates a mock cart context for loading state.
 */
export function createLoadingCartContext(): MockCartContextValue {
  return createMockCartContext({
    cart: null,
    loading: true,
  });
}

/**
 * Creates a mock cart context with error.
 */
export function createErrorCartContext(message = 'Failed to load cart'): MockCartContextValue {
  return createMockCartContext({
    cart: null,
    loading: false,
    error: message,
  });
}

// ============================================
// React Testing Utilities
// ============================================

/**
 * Creates a mock useCart hook for component testing.
 *
 * @example
 * ```typescript
 * // In your test file:
 * const mockUseCart = createMockUseCart({ loading: false });
 *
 * vi.mock('@/contexts/CartContext', () => ({
 *   useCart: () => mockUseCart(),
 * }));
 * ```
 */
export function createMockUseCart(options: MockCartOptions = {}): () => MockCartContextValue {
  const cartValue = createMockCartContext(options);
  return () => cartValue;
}

// ============================================
// Pre-configured Mock Hooks
// ============================================

/**
 * Pre-configured mock hooks for common scenarios.
 * Import and use directly in vi.mock calls.
 */
export const mockUseCartEmpty = createMockUseCart({ cart: defaultMockCart });
export const mockUseCartLoading = createMockUseCart({ loading: true, cart: null });
export const mockUseCartError = createMockUseCart({ error: 'Failed to load cart', cart: null });

// ============================================
// Mock Reset Utility
// ============================================

/**
 * Resets all mocks in a cart context value.
 * Call this in beforeEach or afterEach hooks.
 */
export function resetCartMock(cartValue: MockCartContextValue) {
  cartValue.addToCart.mockClear();
  cartValue.updateQuantity.mockClear();
  cartValue.removeItem.mockClear();
  cartValue.clearCart.mockClear();
  cartValue.refreshCart.mockClear();
}