/**
 * Integration Tests for hooks/useAdminOrders.ts
 *
 * Tests for React Query hooks managing order operations.
 * Target coverage: 80%
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User, AuthError } from '@supabase/supabase-js';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper to create minimal mock User
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as User;
}

// Helper to create mock AuthError
function createMockAuthError(message: string): AuthError {
  return new Error(message) as AuthError;
}

// Mock Supabase client
const mockQueryBuilder = () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };
  return builder;
};

let queryBuilder: ReturnType<typeof mockQueryBuilder> & { _table?: string };

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      queryBuilder._table = table;
      return queryBuilder;
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      }),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useAdminOrder,
  useOrderStatusHistory,
  useUpdateOrderStatus,
  useAdminOrders,
} from '@/hooks/useAdminOrders';

// ============================================
// Test Utilities
// ============================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ============================================
// Tests: useAdminOrder
// ============================================

describe('useAdminOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  describe('order fetching with details', () => {
    it('fetches order with related data', async () => {
      const mockOrder = {
        id: 'order-1',
        order_number: 'ORD-001',
        user_id: 'user-1',
        status: 'processing',
        total_amount: 1500,
        checkout_session_id: 'session-1',
      };

      const mockItems = [
        { id: 'item-1', product_id: 'prod-1', product: { id: 'prod-1', title: 'Product 1', slug: 'product-1' } },
      ];

      const mockCustomer = { id: 'user-1', full_name: 'John Doe' };
      const mockSession = { id: 'session-1', shipping_address: '123 Main St' };
      const mockPayments = [{ id: 'pay-1', status: 'completed', amount: 1500 }];

      // Mock the sequential queries
      let callCount = 0;
      vi.mocked(queryBuilder.select).mockImplementation(() => {
        callCount++;
        return queryBuilder;
      });

      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.single).mockImplementation(() => {
        if (callCount === 1) {
          return Promise.resolve({ data: mockOrder, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({ data: null, error: null })
      );

      const { result } = renderHook(() => useAdminOrder('order-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The hook should have fetched order, items, customer, session, and payments
      expect(queryBuilder.select).toHaveBeenCalled();
    });

    it('returns undefined when orderId is undefined', async () => {
      const { result } = renderHook(() => useAdminOrder(undefined), {
        wrapper: createWrapper(),
      });

      // When query is disabled (orderId is undefined), data is undefined
      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle');
      });

      expect(result.current.data).toBeUndefined();
    });

    it('handles order not found', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.single).mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' },
        })
      );

      const { result } = renderHook(() => useAdminOrder('nonexistent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('handles missing customer gracefully', async () => {
      const mockOrder = {
        id: 'order-1',
        user_id: 'user-1',
        status: 'processing',
      };

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.single).mockImplementation(() =>
        Promise.resolve({ data: mockOrder, error: null })
      );

      const { result } = renderHook(() => useAdminOrder('order-1'), {
        wrapper: createWrapper(),
      });

      // Should not throw - customer lookup should fail gracefully
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});

// ============================================
// Tests: useOrderStatusHistory
// ============================================

describe('useOrderStatusHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('fetches status history with actor info', async () => {
    const mockEvents = [
      {
        id: 'event-1',
        order_id: 'order-1',
        status: 'shipped',
        actor: { id: 'admin-1', full_name: 'Admin User' },
        created_at: '2024-01-01T12:00:00Z',
      },
    ];

    vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);

    // Mock the query resolution
    Object.defineProperty(queryBuilder, 'then', {
      value: (resolve: (value: unknown) => void) =>
        resolve({ data: mockEvents, error: null }),
    });

    const { result } = renderHook(() => useOrderStatusHistory('order-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('returns undefined when orderId is undefined', async () => {
    const { result } = renderHook(() => useOrderStatusHistory(undefined), {
      wrapper: createWrapper(),
    });

    // When query is disabled (orderId is undefined), data is undefined
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });

    expect(result.current.data).toBeUndefined();
  });

  it('handles database error', async () => {
    vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);

    Object.defineProperty(queryBuilder, 'then', {
      value: (resolve: (value: unknown) => void) =>
        resolve({ data: null, error: { message: 'Database error' } }),
    });

    const { result } = renderHook(() => useOrderStatusHistory('order-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================
// Tests: useUpdateOrderStatus
// ============================================

describe('useUpdateOrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('updates order status and creates event', async () => {
    // Mock auth
    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: createMockUser({ id: 'admin-user-id' }) },
      error: null,
    });

    // Mock order update
    vi.mocked(queryBuilder.update).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() =>
      Promise.resolve({ error: null })
    );

    // Mock event insert
    vi.mocked(queryBuilder.insert).mockImplementation(() =>
      Promise.resolve({ error: null })
    );

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        orderId: 'order-1',
        newStatus: 'shipped',
        previousStatus: 'processing',
        notes: 'Shipped via express delivery',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryBuilder.update).toHaveBeenCalledWith({ status: 'shipped' });
    expect(queryBuilder.insert).toHaveBeenCalled();
  });

  it('handles authentication error', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: createMockAuthError('Not authenticated'),
    });

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        orderId: 'order-1',
        newStatus: 'shipped',
        previousStatus: 'processing',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('handles update error', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: createMockUser({ id: 'admin-user-id' }) },
      error: null,
    });

    vi.mocked(queryBuilder.update).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() =>
      Promise.resolve({ error: { message: 'Update failed' } })
    );

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        orderId: 'order-1',
        newStatus: 'shipped',
        previousStatus: 'processing',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('continues even if event creation fails', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: createMockUser({ id: 'admin-user-id' }) },
      error: null,
    });

    // Mock successful order update
    vi.mocked(queryBuilder.update).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() =>
      Promise.resolve({ error: null })
    );

    // Mock failed event insert (but should not throw)
    vi.mocked(queryBuilder.insert).mockImplementation(() =>
      Promise.resolve({ error: { message: 'Event insert failed' } })
    );

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        orderId: 'order-1',
        newStatus: 'shipped',
        previousStatus: 'processing',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('invalidates queries on success', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: createMockUser({ id: 'admin-user-id' }) },
      error: null,
    });

    vi.mocked(queryBuilder.update).mockImplementation(() => queryBuilder);
    vi.mocked(queryBuilder.eq).mockImplementation(() =>
      Promise.resolve({ error: null })
    );
    vi.mocked(queryBuilder.insert).mockImplementation(() =>
      Promise.resolve({ error: null })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Set up some cached data
    queryClient.setQueryData(['admin-order', 'order-1'], { id: 'order-1' });
    queryClient.setQueryData(['order-status-history', 'order-1'], []);
    queryClient.setQueryData(['admin-orders'], { orders: [], total: 0 });

    const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };

    const { result } = renderHook(() => useUpdateOrderStatus(), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({
        orderId: 'order-1',
        newStatus: 'shipped',
        previousStatus: 'processing',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Queries should be invalidated (marked as stale)
    expect(queryClient.getQueryState(['admin-order', 'order-1'])?.isInvalidated).toBe(true);
  });
});

// ============================================
// Tests: useAdminOrders
// ============================================

describe('useAdminOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  describe('order listing', () => {
    it('fetches orders with default parameters', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          status: 'processing',
          profiles: { id: 'user-1', full_name: 'John Doe', phone: '1234567890' },
        },
      ];

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: mockOrders, error: null, count: 1 })
      );

      const { result } = renderHook(() => useAdminOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.orders).toHaveLength(1);
      expect(result.current.data?.total).toBe(1);
    });

    it('applies search filter', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.or).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: [], error: null, count: 0 })
      );

      const { result } = renderHook(() => useAdminOrders({ search: 'ORD-001' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.or).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: [], error: null, count: 0 })
      );

      const { result } = renderHook(() => useAdminOrders({ status: 'processing' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'processing');
    });

    it('applies payment status filter', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: [], error: null, count: 0 })
      );

      const { result } = renderHook(() => useAdminOrders({ paymentStatus: 'completed' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('payment_status', 'completed');
    });

    it('applies pagination correctly', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: [], error: null, count: 100 })
      );

      const { result } = renderHook(() => useAdminOrders({ page: 2, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Page 2 with limit 10 = range(10, 19)
      expect(queryBuilder.range).toHaveBeenCalledWith(10, 19);
    });

    it('handles database error', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' },
        })
      );

      const { result } = renderHook(() => useAdminOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('data transformation', () => {
    it('returns orders with profile data', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          status: 'processing',
          profiles: { id: 'user-1', full_name: 'John Doe', phone: '1234567890' },
        },
      ];

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.range).mockImplementation(() =>
        Promise.resolve({ data: mockOrders, error: null, count: 1 })
      );

      const { result } = renderHook(() => useAdminOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.orders[0].profiles).toEqual({
        id: 'user-1',
        full_name: 'John Doe',
        phone: '1234567890',
      });
    });
  });
});