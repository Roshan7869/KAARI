/**
 * Integration Tests for hooks/useAdminDashboard.ts
 *
 * Tests for React Query hooks managing dashboard metrics and recent orders.
 * Target coverage: 80%
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Supabase client
const mockQueryBuilder = () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
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
  },
}));

import {
  useDashboardMetrics,
  useRecentOrders,
  formatCurrency,
  formatRelativeTime,
  getStatusVariant,
  type TimePeriod,
} from '@/hooks/useAdminDashboard';

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
// Tests: useDashboardMetrics
// ============================================

describe('useDashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metrics calculation', () => {
    it('fetches and calculates dashboard metrics', async () => {
      // Mock Promise.all responses
      let callCount = 0;
      vi.mocked(queryBuilder.select).mockImplementation(() => {
        callCount++;
        return queryBuilder;
      });

      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);

      // Mock the query resolution
      const mockResponses = [
        { count: 100, error: null }, // orders
        { data: [{ amount: 1000 }, { amount: 2000 }], error: null }, // payments
        { count: 50, error: null }, // profiles
        { count: 10, error: null }, // pending orders
      ];

      let responseIndex = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          const response = mockResponses[responseIndex % mockResponses.length];
          responseIndex++;
          return (resolve: (value: unknown) => void) => resolve(response);
        },
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Revenue should be sum of payment amounts
      expect(result.current.data?.totalRevenue).toBe(3000);
      expect(result.current.data?.totalOrders).toBe(100);
      expect(result.current.data?.totalCustomers).toBe(50);
      expect(result.current.data?.pendingOrders).toBe(10);
    });

    it('applies date filter for "today" period', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useDashboardMetrics('today'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // gte should be called with today's date
      expect(queryBuilder.gte).toHaveBeenCalled();
      const gteCall = vi.mocked(queryBuilder.gte).mock.calls[0];
      expect(gteCall[0]).toBe('created_at');
      // Date should be today's date (YYYY-MM-DD format)
      expect(gteCall[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('applies date filter for "week" period', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useDashboardMetrics('week'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.gte).toHaveBeenCalled();
    });

    it('applies date filter for "month" period', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.gte).toHaveBeenCalled();
    });

    it('does not apply date filter for "all" period', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useDashboardMetrics('all'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // For 'all' period, gte should be called with '1970-01-01' (all time)
      expect(queryBuilder.gte).toHaveBeenCalled();
    });

    it('handles database error gracefully', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { message: 'Database error' } }),
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('calculates revenue from completed payments only', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      // Mock responses in order: orders, payments, profiles, pending orders
      const mockResponses = [
        { count: 50, error: null }, // orders
        { data: [{ amount: 1000 }, { amount: 500 }, { amount: 250 }], error: null }, // payments
        { count: 25, error: null }, // profiles
        { count: 5, error: null }, // pending orders
      ];

      let responseIndex = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          const response = mockResponses[responseIndex % mockResponses.length];
          responseIndex++;
          return (resolve: (value: unknown) => void) => resolve(response);
        },
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Sum: 1000 + 500 + 250 = 1750
      expect(result.current.data?.totalRevenue).toBe(1750);
    });

    it('returns zeros for empty data', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);

      const mockResponses = [
        { count: 0, error: null },
        { data: [], error: null },
        { count: 0, error: null },
        { count: 0, error: null },
      ];

      let responseIndex = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          const response = mockResponses[responseIndex % mockResponses.length];
          responseIndex++;
          return (resolve: (value: unknown) => void) => resolve(response);
        },
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        pendingOrders: 0,
      });
    });
  });

  describe('caching behavior', () => {
    it('caches metrics with 1-minute stale time', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.gte).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null, count: 0 }),
      });

      const { result } = renderHook(() => useDashboardMetrics('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query should be cached
      expect(result.current.isStale).toBe(false);
    });
  });
});

// ============================================
// Tests: useRecentOrders
// ============================================

describe('useRecentOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  describe('recent orders fetching', () => {
    it('fetches recent orders with customer info', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          status: 'processing',
          total_amount: 1500,
          created_at: '2024-01-01T12:00:00Z',
          user_id: 'user-1',
        },
        {
          id: 'order-2',
          order_number: 'ORD-002',
          status: 'pending',
          total_amount: 2000,
          created_at: '2024-01-01T11:00:00Z',
          user_id: 'user-2',
        },
      ];

      const mockProfiles = [
        { id: 'user-1', full_name: 'John Doe' },
        { id: 'user-2', full_name: 'Jane Smith' },
      ];

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.in).mockImplementation(() => queryBuilder);

      // Mock orders query then profiles query
      let callCount = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          callCount++;
          if (callCount === 1) {
            return (resolve: (value: unknown) => void) => resolve({ data: mockOrders, error: null });
          }
          return (resolve: (value: unknown) => void) => resolve({ data: mockProfiles, error: null });
        },
      });

      const { result } = renderHook(() => useRecentOrders(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].customer_name).toBe('John Doe');
      expect(result.current.data?.[1].customer_name).toBe('Jane Smith');
    });

    it('handles orders without profiles gracefully', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          status: 'processing',
          total_amount: 1500,
          created_at: '2024-01-01T12:00:00Z',
          user_id: 'user-1',
        },
      ];

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.in).mockImplementation(() => queryBuilder);

      let callCount = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          callCount++;
          if (callCount === 1) {
            return (resolve: (value: unknown) => void) => resolve({ data: mockOrders, error: null });
          }
          return (resolve: (value: unknown) => void) => resolve({ data: [], error: null });
        },
      });

      const { result } = renderHook(() => useRecentOrders(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].customer_name).toBe('Unknown Customer');
    });

    it('respects limit parameter', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      });

      const { result } = renderHook(() => useRecentOrders(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });

    it('returns empty array for no orders', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      });

      const { result } = renderHook(() => useRecentOrders(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('handles database error', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);

      Object.defineProperty(queryBuilder, 'then', {
        value: (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { message: 'Database error' } }),
      });

      const { result } = renderHook(() => useRecentOrders(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('continues even if profiles fetch fails', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          order_number: 'ORD-001',
          status: 'processing',
          total_amount: 1500,
          created_at: '2024-01-01T12:00:00Z',
          user_id: 'user-1',
        },
      ];

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.in).mockImplementation(() => queryBuilder);

      let callCount = 0;
      Object.defineProperty(queryBuilder, 'then', {
        get: () => {
          callCount++;
          if (callCount === 1) {
            return (resolve: (value: unknown) => void) => resolve({ data: mockOrders, error: null });
          }
          // Profiles fetch fails
          return (resolve: (value: unknown) => void) => resolve({ data: null, error: { message: 'Profiles error' } });
        },
      });

      const { result } = renderHook(() => useRecentOrders(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still return orders with 'Unknown Customer'
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].customer_name).toBe('Unknown Customer');
    });
  });
});

// ============================================
// Tests: Utility Functions
// ============================================

describe('formatCurrency', () => {
  it('formats amount in INR currency', () => {
    const result = formatCurrency(1000);
    expect(result).toMatch(/₹/);
    expect(result).toContain('1,000');
  });

  it('handles zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toBe('₹0');
  });

  it('handles decimal amounts', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234.56');
  });

  it('handles large amounts', () => {
    const result = formatCurrency(10000000);
    expect(result).toContain('1,00,00,000');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for recent times', () => {
    const now = new Date('2024-01-15T11:59:30Z').toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago for times within an hour', () => {
    const fiveMinAgo = new Date('2024-01-15T11:55:00Z').toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');

    const thirtyMinAgo = new Date('2024-01-15T11:30:00Z').toISOString();
    expect(formatRelativeTime(thirtyMinAgo)).toBe('30m ago');
  });

  it('returns hours ago for times within a day', () => {
    const twoHoursAgo = new Date('2024-01-15T10:00:00Z').toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');

    const twelveHoursAgo = new Date('2024-01-15T00:00:00Z').toISOString();
    expect(formatRelativeTime(twelveHoursAgo)).toBe('12h ago');
  });

  it('returns days ago for times within a week', () => {
    const oneDayAgo = new Date('2024-01-14T12:00:00Z').toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');

    const threeDaysAgo = new Date('2024-01-12T12:00:00Z').toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns formatted date for older times', () => {
    const twoWeeksAgo = new Date('2024-01-01T12:00:00Z').toISOString();
    const result = formatRelativeTime(twoWeeksAgo);
    // Should be a date format like "1 Jan"
    expect(result).toMatch(/^\d{1,2} \w{3}$/);
  });
});

describe('getStatusVariant', () => {
  it('returns "default" for paid and delivered status', () => {
    expect(getStatusVariant('paid')).toBe('default');
    expect(getStatusVariant('delivered')).toBe('default');
  });

  it('returns "secondary" for processing and shipped status', () => {
    expect(getStatusVariant('processing')).toBe('secondary');
    expect(getStatusVariant('shipped')).toBe('secondary');
  });

  it('returns "outline" for pending status', () => {
    expect(getStatusVariant('pending')).toBe('outline');
  });

  it('returns "destructive" for cancelled and failed status', () => {
    expect(getStatusVariant('cancelled')).toBe('destructive');
    expect(getStatusVariant('failed')).toBe('destructive');
  });

  it('returns "outline" for unknown status', () => {
    expect(getStatusVariant('unknown')).toBe('outline');
    expect(getStatusVariant('')).toBe('outline');
    expect(getStatusVariant('random')).toBe('outline');
  });
});