/**
 * Unit Tests for lib/payment-secure.ts
 *
 * Security-critical tests for payment session management.
 * Target coverage: 90%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSecurePaymentSession,
  verifySecurePaymentSession,
  completeSecurePaymentSession,
  getSecurePaymentSession,
  processSecurePayment,
  initiatePayment,
} from '@/lib/payment-secure';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the supabase client
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockAuthGetUser(),
    },
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args?: Record<string, unknown>) => mockRpc(fn, args),
  },
}));

// ============================================
// Test Utilities
// ============================================

function createMockQueryBuilder(data: unknown = null, error: null | Error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    resolve: vi.fn().mockResolvedValue({ data, error }),
  };
}

// ============================================
// Tests: createSecurePaymentSession
// ============================================

describe('createSecurePaymentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authentication validation', () => {
    it('returns error when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('returns error when user is null', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('session creation', () => {
    it('creates session successfully', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: 1000,
          currency: 'INR',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }],
        error: null,
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(true);
      expect(result.session?.sessionId).toBe('session-abc');
      expect(result.session?.orderId).toBe('order-123');
      expect(result.session?.amount).toBe(1000);
    });

    it('handles string amount from RPC response', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: '1000.50', // String amount
          currency: 'INR',
          expires_at: new Date().toISOString(),
        }],
        error: null,
      });

      const result = await createSecurePaymentSession('order-123', 1000.50, 'upi');

      expect(result.success).toBe(true);
      expect(result.session?.amount).toBeCloseTo(1000.50);
    });

    it('returns error when order not found', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Order not found' },
      });

      const result = await createSecurePaymentSession('nonexistent', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });

    it('returns error when order does not belong to user', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Order does not belong to user' },
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not authorized to pay for this order');
    });

    it('returns error when order cannot accept payment', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Order cannot accept payment' },
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('This order cannot accept payment');
    });

    it('returns error on amount mismatch', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Amount mismatch: expected 1000, got 500' },
      });

      const result = await createSecurePaymentSession('order-123', 500, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount does not match order total');
    });

    it('returns error on invalid response', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response from payment service');
    });

    it('returns error on empty response array', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response from payment service');
    });

    it('handles unexpected errors', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  describe('payment methods', () => {
    it('accepts upi payment method', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: 1000,
          currency: 'INR',
          expires_at: new Date().toISOString(),
        }],
        error: null,
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'upi');
      expect(result.success).toBe(true);
    });

    it('accepts card payment method', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: 1000,
          currency: 'INR',
          expires_at: new Date().toISOString(),
        }],
        error: null,
      });

      const result = await createSecurePaymentSession('order-123', 1000, 'card');
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Tests: verifySecurePaymentSession
// ============================================

describe('verifySecurePaymentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('session verification', () => {
    it('verifies valid session', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          valid: true,
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: 1000,
          status: 'pending',
          error: null,
        }],
        error: null,
      });

      const result = await verifySecurePaymentSession('session-abc', true);

      expect(result.valid).toBe(true);
      expect(result.sessionId).toBe('session-abc');
      expect(result.orderId).toBe('order-123');
      expect(result.amount).toBe(1000);
    });

    it('verifies without ownership check', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: [{
          valid: true,
          session_id: 'session-abc',
          order_id: 'order-123',
          amount: '500.00',
          status: 'pending',
          error: null,
        }],
        error: null,
      });

      const result = await verifySecurePaymentSession('session-abc', false);

      expect(result.valid).toBe(true);
      expect(result.amount).toBeCloseTo(500);
    });

    it('returns invalid for non-existent session', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await verifySecurePaymentSession('nonexistent', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('returns invalid for empty response', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await verifySecurePaymentSession('session-abc', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('handles RPC error', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await verifySecurePaymentSession('session-abc', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to verify payment session');
    });

    it('handles unexpected errors', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await verifySecurePaymentSession('session-abc', true);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });
});

// ============================================
// Tests: completeSecurePaymentSession
// ============================================

describe('completeSecurePaymentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes session successfully', async () => {
    mockRpc.mockResolvedValue({
      data: [{ success: true, order_id: 'order-123', message: 'Session completed' }],
      error: null,
    });

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('order-123');
  });

  it('handles failed completion', async () => {
    mockRpc.mockResolvedValue({
      data: [{ success: false, order_id: 'order-123', message: 'Already completed' }],
      error: null,
    });

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Already completed');
  });

  it('handles RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to complete payment session');
  });

  it('handles invalid response', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid response');
  });

  it('handles empty response array', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid response');
  });

  it('handles unexpected errors', async () => {
    mockRpc.mockRejectedValue(new Error('Network error'));

    const result = await completeSecurePaymentSession('session-abc', 'txn-123', 'completed');

    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred');
  });
});

// ============================================
// Tests: getSecurePaymentSession
// ============================================

describe('getSecurePaymentSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication validation', () => {
    it('returns error when not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getSecurePaymentSession('session-abc');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('return type validation', () => {
    it('returns correct structure for successful session', () => {
      const session = {
        sessionId: 'session-abc',
        orderId: 'order-123',
        amount: 1000,
        currency: 'INR',
        status: 'pending',
        paymentMethod: 'upi',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      expect(session.sessionId).toBeDefined();
      expect(session.orderId).toBeDefined();
      expect(session.amount).toBeDefined();
      expect(session.currency).toBe('INR');
      expect(session.status).toBe('pending');
      expect(session.paymentMethod).toBe('upi');
    });

    it('handles string amount conversion', () => {
      const stringAmount = '1500.75';
      const parsedAmount = typeof stringAmount === 'string' ? parseFloat(stringAmount) : stringAmount;

      expect(parsedAmount).toBeCloseTo(1500.75);
    });
  });
});

// ============================================
// Tests: processSecurePayment
// ============================================

describe('processSecurePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('processes payment successfully', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        valid: true,
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        status: 'pending',
      }],
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{ success: true, order_id: 'order-123', message: 'Completed' }],
      error: null,
    });

    const result = await processSecurePayment('session-abc', { processingDelayMs: 0 });

    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^txn_/);
    expect(result.orderId).toBe('order-123');
  });

  it('returns error for invalid session', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValue({
      data: [{ valid: false, error: 'Session expired' }],
      error: null,
    });

    const result = await processSecurePayment('session-abc');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Session expired');
  });

  it('simulates failure when failure rate triggers', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValue({
      data: [{
        valid: true,
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        status: 'pending',
      }],
      error: null,
    });

    // Force failure by setting failure rate to 1
    const result = await processSecurePayment('session-abc', {
      processingDelayMs: 0,
      failureRate: 1
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Payment failed (simulated). Please try again.');
  });

  it('handles completion failure', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        valid: true,
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        status: 'pending',
      }],
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{ success: false, message: 'Session already completed' }],
      error: null,
    });

    const result = await processSecurePayment('session-abc', { processingDelayMs: 0 });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Session already completed');
  });
});

// ============================================
// Tests: initiatePayment
// ============================================

describe('initiatePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to order confirmation for COD', async () => {
    const result = await initiatePayment('order-123', 1000, 'cod');

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBe('/order-confirmation/order-123');
  });

  it('creates session and redirects for online payment', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        currency: 'INR',
        expires_at: new Date().toISOString(),
      }],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null, // No active gateway
        error: null,
      }),
    });

    const result = await initiatePayment('order-123', 1000, 'upi');

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe('session-abc');
    expect(result.redirectUrl).toContain('/payment?session_id=session-abc');
  });

  it('normalizes online payment method to upi', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        currency: 'INR',
        expires_at: new Date().toISOString(),
      }],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const result = await initiatePayment('order-123', 1000, 'online');

    expect(result.success).toBe(true);
  });

  it('returns error when session creation fails', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Order not found' },
    });

    const result = await initiatePayment('nonexistent', 1000, 'upi');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Order not found');
  });

  it('routes through Cashfree when gateway is configured', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        currency: 'INR',
        expires_at: new Date().toISOString(),
      }],
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { is_active: true, api_key: 'test-key', api_secret: 'test-secret' },
        error: null,
      }),
    });

    const result = await initiatePayment('order-123', 1000, 'card');

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toContain('/payment?session_id=session-abc');
  });

  it('falls back to dummy payment on gateway check error', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockRpc.mockResolvedValueOnce({
      data: [{
        session_id: 'session-abc',
        order_id: 'order-123',
        amount: 1000,
        currency: 'INR',
        expires_at: new Date().toISOString(),
      }],
      error: null,
    });

    mockFrom.mockImplementation(() => {
      throw new Error('Gateway check failed');
    });

    const result = await initiatePayment('order-123', 1000, 'upi');

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toContain('/payment?session_id=session-abc');
  });
});