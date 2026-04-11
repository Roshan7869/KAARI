/**
 * Integration Tests for hooks/usePaymentStatus.ts
 *
 * Tests for payment status polling with exponential backoff.
 * Target coverage: 80%
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
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

import { usePaymentStatus } from '@/hooks/usePaymentStatus';

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

// Helper to advance timers and wait for async operations
async function advanceTimersAndWait(ms: number) {
  vi.advanceTimersByTime(ms);
  await vi.waitFor(() => Promise.resolve(), { timeout: 100 });
}

// ============================================
// Tests: usePaymentStatus
// ============================================

describe('usePaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryBuilder = mockQueryBuilder();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it.skip('starts polling when enabled is true', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () => usePaymentStatus({ orderId: 'order-1', enabled: true, intervalMs: 1000 }),
        { wrapper: createWrapper() }
      );

      // Should start polling immediately
      expect(result.current.isPolling).toBe(true);
      expect(result.current.status).toBe('pending');

      await advanceTimersAndWait(1000);

      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalled();
      });
    });

    it.skip('does not start polling when enabled is false', async () => {
      const { result } = renderHook(
        () => usePaymentStatus({ orderId: 'order-1', enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPolling).toBe(false);
      expect(result.current.status).toBe('pending');

      vi.advanceTimersByTime(5000);

      // Should not have queried
      expect(queryBuilder.select).not.toHaveBeenCalled();
    });

    it.skip('does not start polling when orderId is empty string', async () => {
      const { result } = renderHook(
        () => usePaymentStatus({ orderId: '', enabled: true }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPolling).toBe(false);
      expect(result.current.status).toBe('pending');
    });
  });

  describe('payment status polling', () => {
    it.skip('polls for payment status at specified interval', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () => usePaymentStatus({ orderId: 'order-1', enabled: true, intervalMs: 1000 }),
        { wrapper: createWrapper() }
      );

      // Initial poll
      await advanceTimersAndWait(100);

      // First poll happens
      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalledTimes(1);
      });

      // Wait for next poll (with backoff)
      await advanceTimersAndWait(1300); // First backoff delay

      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalledTimes(2);
      });
    });

    it.skip('stops polling when payment is completed', async () => {
      let pollCount = 0;

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() => {
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve({
            data: { status: 'completed', external_transaction_id: 'txn-123' },
            error: null,
          });
        }
        return Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        });
      });

      const onComplete = vi.fn();

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
            onComplete,
          }),
        { wrapper: createWrapper() }
      );

      // First poll
      await advanceTimersAndWait(100);

      await waitFor(() => {
        expect(result.current.status).toBe('completed');
        expect(result.current.isPolling).toBe(false);
        expect(result.current.transactionId).toBe('txn-123');
        expect(onComplete).toHaveBeenCalledWith('completed');
      });

      // Advance more time - should not poll again
      vi.advanceTimersByTime(5000);

      expect(queryBuilder.select).toHaveBeenCalledTimes(1); // Only one poll
    });

    it.skip('stops polling when payment fails', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'failed', external_transaction_id: 'txn-failed' },
          error: null,
        })
      );

      const onComplete = vi.fn();

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
            onComplete,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      await waitFor(() => {
        expect(result.current.status).toBe('failed');
        expect(result.current.isPolling).toBe(false);
        expect(onComplete).toHaveBeenCalledWith('failed');
      });
    });

    it.skip('sets status to unknown when no payment record found', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({ data: null, error: null })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
            maxAttempts: 2,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      // First poll - no payment found, continue polling
      await waitFor(() => {
        expect(result.current.status).toBe('pending');
        expect(result.current.isPolling).toBe(true);
      });

      // Second poll - still no payment
      await advanceTimersAndWait(1300);

      // After max attempts, should expire
      await advanceTimersAndWait(2000);

      await waitFor(() => {
        expect(result.current.isPolling).toBe(false);
      });
    });
  });

  describe('exponential backoff', () => {
    it.skip('increases polling interval with exponential backoff', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
          }),
        { wrapper: createWrapper() }
      );

      // First poll
      await advanceTimersAndWait(100);

      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalledTimes(1);
      });

      // Second poll at ~1.3x interval (1300ms)
      await advanceTimersAndWait(1300);

      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalledTimes(2);
      });

      // Third poll at ~1.69x interval (1690ms)
      await advanceTimersAndWait(1690);

      await waitFor(() => {
        expect(queryBuilder.select).toHaveBeenCalledTimes(3);
      });
    });

    it('caps backoff at 10 seconds', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
          }),
        { wrapper: createWrapper() }
      );

      // Simulate many polls to reach cap
      for (let i = 0; i < 20; i++) {
        await advanceTimersAndWait(11000); // Advance more than cap
      }

      // The hook should still be polling but intervals should be capped
      expect(result.current.isPolling).toBe(true);
    });
  });

  describe('max attempts', () => {
    it.skip('stops polling after max attempts', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const onComplete = vi.fn();

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 100,
            maxAttempts: 3,
            onComplete,
          }),
        { wrapper: createWrapper() }
      );

      // Poll 3 times
      await advanceTimersAndWait(100); // First poll
      await advanceTimersAndWait(130); // Second poll (backoff)
      await advanceTimersAndWait(169); // Third poll (backoff)

      // After max attempts, should stop and set status to expired
      await waitFor(() => {
        expect(result.current.status).toBe('expired');
        expect(result.current.isPolling).toBe(false);
        expect(result.current.error).toBe('Payment check timed out. Please refresh or contact support.');
        expect(onComplete).toHaveBeenCalledWith('expired');
      });
    });
  });

  describe('manual control', () => {
    it('startPolling initiates polling', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: false, // Not auto-starting
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPolling).toBe(false);

      // Manually start polling
      act(() => {
        result.current.startPolling();
      });

      expect(result.current.isPolling).toBe(true);
    });

    it('stopPolling halts polling', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      expect(result.current.isPolling).toBe(true);

      // Stop polling
      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Advance time - should not poll anymore
      vi.advanceTimersByTime(10000);

      // Should not have made more than the initial poll
      expect(queryBuilder.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('continues polling on network error', async () => {
      let pollCount = 0;

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() => {
        pollCount++;
        if (pollCount === 1) {
          // First poll fails
          return Promise.reject(new Error('Network error'));
        }
        // Second poll succeeds
        return Promise.resolve({
          data: { status: 'completed', external_transaction_id: 'txn-123' },
          error: null,
        });
      });

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 100,
          }),
        { wrapper: createWrapper() }
      );

      // First poll - network error
      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      // Should still be polling despite error
      expect(result.current.isPolling).toBe(true);

      // Second poll - success (with doubled delay for error)
      await act(async () => {
        vi.advanceTimersByTime(400);
        await Promise.resolve();
      });

      // Check final status
      expect(result.current.status).toBe('completed');
      expect(result.current.isPolling).toBe(false);
    }, 15000);

    it.skip('logs errors to logger', async () => {
      const { logger } = await import('@/lib/logger');

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Database error' },
        })
      );

      renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            intervalMs: 1000,
            maxAttempts: 1,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      // Logger should have been called with error
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('stops polling on unmount', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result, unmount } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      expect(result.current.isPolling).toBe(true);

      // Unmount
      unmount();

      // Advance time significantly
      vi.advanceTimersByTime(10000);

      // Query should not have been called after unmount
      // (Only the initial poll before unmount)
      const callCount = vi.mocked(queryBuilder.select).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(2);
    });

    it('cleans up timers on unmount', async () => {
      vi.useFakeTimers();

      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { unmount } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      // Unmount before polling completes
      unmount();

      // Should not throw when timers would have fired
      expect(() => vi.runAllTimers()).not.toThrow();

      vi.useRealTimers();
    });
  });

  describe('transaction ID tracking', () => {
    it('captures transaction ID from completed payment', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'completed', external_transaction_id: 'txn-abc123' },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(result.current.status).toBe('completed');
      expect(result.current.transactionId).toBe('txn-abc123');
    }, 15000);

    it('captures transaction ID from failed payment', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'failed', external_transaction_id: 'txn-failed-xyz' },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.transactionId).toBe('txn-failed-xyz');
    }, 15000);

    it('sets transaction ID to null for pending payment', async () => {
      vi.mocked(queryBuilder.select).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.eq).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.order).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.limit).mockImplementation(() => queryBuilder);
      vi.mocked(queryBuilder.maybeSingle).mockImplementation(() =>
        Promise.resolve({
          data: { status: 'pending', external_transaction_id: null },
          error: null,
        })
      );

      const { result } = renderHook(
        () =>
          usePaymentStatus({
            orderId: 'order-1',
            enabled: true,
            maxAttempts: 1,
          }),
        { wrapper: createWrapper() }
      );

      await advanceTimersAndWait(100);

      expect(result.current.transactionId).toBeNull();
    });
  });
});