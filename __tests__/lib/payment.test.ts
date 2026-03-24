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
});
