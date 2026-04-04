/**
 * Cashfree Callback Integration Tests
 *
 * Tests for handling Cashfree payment callbacks including:
 * - Parsing successful callbacks
 * - Handling different payment statuses
 * - Defaulting to pending for unknown status
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger before importing the module
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

// Import after mocking
import { handleCashfreeCallback } from '../../lib/cashfree-sdk';

describe('handleCashfreeCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses successful callback', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return?order_id=ord_123&status=PAID&transaction_id=txn_456'
    );

    expect(result.orderId).toBe('ord_123');
    expect(result.paymentStatus).toBe('success');
    expect(result.transactionId).toBe('txn_456');
  });

  it('defaults to pending for unknown status', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return?order_id=ord_789&status=UNKNOWN'
    );

    expect(result.orderId).toBe('ord_789');
    expect(result.paymentStatus).toBe('pending');
    expect(result.transactionId).toBeUndefined();
  });

  it('handles failed payment status', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return?order_id=ord_failed&status=FAILED&transaction_id=txn_failed'
    );

    expect(result.orderId).toBe('ord_failed');
    expect(result.paymentStatus).toBe('failed');
    expect(result.transactionId).toBe('txn_failed');
  });

  it('handles callback without transaction_id', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return?order_id=ord_notxn&status=PAID'
    );

    expect(result.orderId).toBe('ord_notxn');
    expect(result.paymentStatus).toBe('success');
    expect(result.transactionId).toBeUndefined();
  });

  it('handles callback without order_id', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return?status=PAID&transaction_id=txn_456'
    );

    expect(result.orderId).toBe('');
    expect(result.paymentStatus).toBe('success');
    expect(result.transactionId).toBe('txn_456');
  });

  it('handles callback without any parameters', async () => {
    const result = await handleCashfreeCallback(
      'https://example.com/payment-return'
    );

    expect(result.orderId).toBe('');
    expect(result.paymentStatus).toBe('pending');
    expect(result.transactionId).toBeUndefined();
  });
});