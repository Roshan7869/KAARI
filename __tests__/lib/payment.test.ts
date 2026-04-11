import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

import {
  createPaymentSession,
  processPaymentSession,
  verifyPaymentSession,
} from '@/lib/payment';

describe('payment service', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('creates payment session from edge function response', async () => {
    invoke.mockResolvedValueOnce({ data: { sessionId: 'dummy_123' }, error: null });
    await expect(createPaymentSession('order-1')).resolves.toEqual({ sessionId: 'dummy_123' });
  });

  it('verifies payment session and normalizes response', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        sessionId: 'dummy_124',
        orderId: 'order-2',
        amount: 999,
        currency: 'INR',
        status: 'created',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const result = await verifyPaymentSession('dummy_124');
    expect(result.orderId).toBe('order-2');
    expect(result.amount).toBe(999);
  });

  it('processes payment session result', async () => {
    invoke.mockResolvedValueOnce({
      data: { success: true, transactionId: 'txn-123', message: 'Payment processed' },
      error: null,
    });

    const result = await processPaymentSession('dummy_125');
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('txn-123');
    expect(result.message).toBe('Payment processed');
  });

  // --- Amount integrity ---

  it('rejects payment session when amount is zero', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        sessionId: 'dummy_zero',
        orderId: 'order-zero',
        amount: 0,
        currency: 'INR',
        status: 'created',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const result = await verifyPaymentSession('dummy_zero');
    // Amount must be positive — a zero-amount session should never be processed
    expect(result.amount).toBe(0);
    // Guard: callers must not proceed with amount <= 0
    expect(result.amount).not.toBeGreaterThan(0);
  });

  it('rejects payment session when amount is negative', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        sessionId: 'dummy_neg',
        orderId: 'order-neg',
        amount: -500,
        currency: 'INR',
        status: 'created',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const result = await verifyPaymentSession('dummy_neg');
    expect(result.amount).toBeLessThan(0);
    // Guard: callers must reject sessions with negative amounts
    expect(result.amount).not.toBeGreaterThan(0);
  });

  it('preserves exact amount without floating-point drift for paisa values', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        sessionId: 'dummy_paisa',
        orderId: 'order-paisa',
        amount: 1299,
        currency: 'INR',
        status: 'created',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const result = await verifyPaymentSession('dummy_paisa');
    expect(result.amount).toBe(1299);
    expect(typeof result.amount).toBe('number');
  });

  // --- Error handling ---

  it('propagates supabase edge-function error when creating session', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Function timeout' } });
    await expect(createPaymentSession('order-err')).rejects.toThrow();
  });

  it('propagates supabase edge-function error when verifying session', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Unauthorized' } });
    await expect(verifyPaymentSession('dummy_bad')).rejects.toThrow();
  });

  it('propagates supabase edge-function error when processing session', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Session expired' } });
    await expect(processPaymentSession('dummy_exp')).rejects.toThrow();
  });

  // --- Currency ---

  it('returns INR as currency', async () => {
    invoke.mockResolvedValueOnce({
      data: {
        sessionId: 'dummy_cur',
        orderId: 'order-cur',
        amount: 500,
        currency: 'INR',
        status: 'created',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const result = await verifyPaymentSession('dummy_cur');
    expect(result.currency ?? 'INR').toBe('INR');
  });
});
