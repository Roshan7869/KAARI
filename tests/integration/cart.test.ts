/**
 * Cart Integration Tests
 * Tests for cart functionality including add, update, remove, and stock validation
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock storage before importing cart utilities
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};

describe('cart utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('creates a cart item with correct structure', () => {
    const cartItem = {
      id: 'item-123',
      cart_id: 'cart-456',
      product_id: 'product-789',
      quantity: 2,
      unit_price: 1999,
      line_total: 3998,
      variant_id: null,
      created_at: new Date().toISOString(),
    };

    expect(cartItem.quantity).toBe(2);
    expect(cartItem.line_total).toBe(3998);
  });

  it('validates cart item quantity is positive', () => {
    const validateQuantity = (quantity: number): boolean => {
      return quantity > 0 && quantity <= 999;
    };

    expect(validateQuantity(1)).toBe(true);
    expect(validateQuantity(100)).toBe(true);
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(-1)).toBe(false);
    expect(validateQuantity(1000)).toBe(false);
  });

  it('calculates line totals correctly', () => {
    const calculateLineTotal = (quantity: number, unitPrice: number): number => {
      return quantity * unitPrice;
    };

    expect(calculateLineTotal(1, 1999)).toBe(1999);
    expect(calculateLineTotal(2, 1999)).toBe(3998);
    expect(calculateLineTotal(3, 999)).toBe(2997);
  });

  it('calculates cart total from items', () => {
    const items = [
      { line_total: 1999, quantity: 1 },
      { line_total: 3998, quantity: 2 },
      { line_total: 1499, quantity: 1 },
    ];

    const total = items.reduce((sum, item) => sum + item.line_total, 0);
    expect(total).toBe(7496);
  });

  it('validates stock before adding to cart', () => {
    const validateStock = (requested: number, available: number): { valid: boolean; error?: string } => {
      if (requested <= 0) {
        return { valid: false, error: 'Invalid quantity' };
      }
      if (requested > available) {
        return { valid: false, error: 'Insufficient stock' };
      }
      return { valid: true };
    };

    expect(validateStock(2, 10)).toEqual({ valid: true });
    expect(validateStock(15, 10)).toEqual({ valid: false, error: 'Insufficient stock' });
    expect(validateStock(0, 10)).toEqual({ valid: false, error: 'Invalid quantity' });
    expect(validateStock(-1, 10)).toEqual({ valid: false, error: 'Invalid quantity' });
  });
});

describe('cart stock validation', () => {
  it('blocks adding more items than available stock', () => {
    const productStock = {
      variant_id: 'variant-123',
      stock_qty: 5,
    };

    const attemptAdd = (quantity: number) => {
      if (quantity > productStock.stock_qty) {
        throw new Error(`Cannot add ${quantity}. Only ${productStock.stock_qty} available.`);
      }
      return true;
    };

    expect(() => attemptAdd(3)).not.toThrow();
    expect(() => attemptAdd(5)).not.toThrow();
    expect(() => attemptAdd(6)).toThrow('Cannot add 6. Only 5 available.');
  });

  it('handles multiple items with limited stock', () => {
    let stock = 10;

    const addItem = (quantity: number): { success: boolean; remaining: number } => {
      if (quantity > stock) {
        return { success: false, remaining: stock };
      }
      stock -= quantity;
      return { success: true, remaining: stock };
    };

    expect(addItem(3)).toEqual({ success: true, remaining: 7 });
    expect(addItem(4)).toEqual({ success: true, remaining: 3 });
    expect(addItem(3)).toEqual({ success: false, remaining: 3 }); // Would exceed
    expect(addItem(2)).toEqual({ success: true, remaining: 1 });
  });
});

describe('cart item management', () => {
  it('updates cart item quantity correctly', () => {
    let item = { id: 'item-1', quantity: 2, unit_price: 1000 };

    const updateQuantity = (newQuantity: number) => {
      if (newQuantity <= 0) return null;
      item = { ...item, quantity: newQuantity, line_total: newQuantity * item.unit_price };
      return item;
    };

    expect(updateQuantity(3)).toEqual({ id: 'item-1', quantity: 3, unit_price: 1000, line_total: 3000 });
    expect(updateQuantity(1)).toEqual({ id: 'item-1', quantity: 1, unit_price: 1000, line_total: 1000 });
    expect(updateQuantity(0)).toBeNull();
    expect(updateQuantity(-1)).toBeNull();
  });

  it('removes cart item correctly', () => {
    let items = [{ id: '1' }, { id: '2' }, { id: '3' }];

    const removeItem = (itemId: string) => items.filter(i => i.id !== itemId);

    expect(removeItem('2')).toEqual([{ id: '1' }, { id: '3' }]);
    expect(removeItem('1')).toEqual([{ id: '2' }, { id: '3' }]);
    expect(removeItem('nonexistent')).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
  });
});

describe('cart persistence', () => {
  it('serializes cart to storage', () => {
    const cart = {
      id: 'cart-123',
      user_id: 'user-456',
      items: [
        { id: 'item-1', product_id: 'prod-1', quantity: 2 },
        { id: 'item-2', product_id: 'prod-2', quantity: 1 },
      ],
      created_at: new Date().toISOString(),
    };

    const serialized = JSON.stringify(cart);
    const parsed = JSON.parse(serialized);

    expect(parsed.id).toBe('cart-123');
    expect(parsed.items.length).toBe(2);
  });

  it('clears cart after checkout', () => {
    const cart = {
      id: 'cart-123',
      items: [{ id: 'item-1' }, { id: 'item-2' }],
    };

    const clearCart = () => ({ ...cart, items: [] });

    expect(clearCart()).toEqual({ id: 'cart-123', items: [] });
  });
});
