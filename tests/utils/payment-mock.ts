/**
 * Payment Gateway Mock Factory
 *
 * This module provides utilities for mocking payment-related functions
 * including Cashfree SDK, payment session creation, and webhook validation.
 */

import { vi } from 'vitest';

// ============================================
// Types
// ============================================

export interface MockPaymentSession {
  session_id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  expires_at: string;
  user_id?: string;
}

export interface MockPaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
}

export interface MockCashfreeConfig {
  simulateFailure?: boolean;
  failureRate?: number;
  processingDelayMs?: number;
}

// ============================================
// Mock Factories
// ============================================

/**
 * Creates a mock payment session for testing.
 */
export function createMockPaymentSession(
  options: Partial<MockPaymentSession> = {}
): MockPaymentSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  return {
    session_id: options.session_id || `test_session_${Date.now()}`,
    order_id: options.order_id || 'test-order-id',
    amount: options.amount || 1000,
    currency: options.currency || 'INR',
    payment_method: options.payment_method || 'card',
    status: options.status || 'pending',
    created_at: options.created_at || now.toISOString(),
    expires_at: options.expires_at || expiresAt.toISOString(),
    user_id: options.user_id || 'test-user-id',
    ...options,
  };
}

/**
 * Creates a mock successful payment result.
 */
export function createMockSuccessResult(): MockPaymentResult {
  return {
    success: true,
    transactionId: `txn_success_${Date.now()}`,
    message: 'Payment processed successfully',
  };
}

/**
 * Creates a mock failed payment result.
 */
export function createMockFailureResult(message = 'Payment failed'): MockPaymentResult {
  return {
    success: false,
    transactionId: undefined,
    message,
  };
}

// ============================================
// Payment Function Mocks
// ============================================

/**
 * Mock implementation for generateDummyPaymentSession.
 */
export const mockGenerateDummyPaymentSession = vi.fn(
  (
    orderId: string,
    amount: number,
    paymentMethod: string
  ): MockPaymentSession => {
    return createMockPaymentSession({
      order_id: orderId,
      amount,
      payment_method: paymentMethod,
      status: 'pending',
    });
  }
);

/**
 * Mock implementation for getDummyPaymentSession.
 */
export const mockGetDummyPaymentSession = vi.fn(
  (sessionId: string): MockPaymentSession | null => {
    // Return null to simulate expired/non-existent session
    if (sessionId === 'invalid-session') {
      return null;
    }
    if (sessionId === 'expired-session') {
      return null;
    }
    return createMockPaymentSession({ session_id: sessionId });
  }
);

/**
 * Mock implementation for processPayment.
 */
export const mockProcessPayment = vi.fn(
  async (
    sessionId: string,
    config: MockCashfreeConfig = {}
  ): Promise<MockPaymentResult> => {
    const { simulateFailure = false, processingDelayMs = 0 } = config;

    // Simulate processing delay
    if (processingDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, processingDelayMs));
    }

    // Check for invalid session
    if (sessionId === 'invalid-session') {
      return createMockFailureResult('Payment session not found or expired');
    }

    // Simulate failure
    if (simulateFailure) {
      return createMockFailureResult('Payment failed. Please try again.');
    }

    return createMockSuccessResult();
  }
);

/**
 * Mock implementation for verifyDummyWebhookSignature.
 */
export const mockVerifyDummyWebhookSignature = vi.fn(
  (sessionId: string): boolean => {
    // Return false for invalid sessions
    if (sessionId === 'invalid-session') {
      return false;
    }
    return true;
  }
);

// ============================================
// Cashfree SDK Mock
// ============================================

/**
 * Mock for Cashfree SDK payment functions.
 * Use this when testing components that interact with Cashfree.
 */
export const mockCashfreeSDK = {
  createOrder: vi.fn().mockResolvedValue({
    orderId: 'test-order-id',
    paymentSessionId: 'test-session-id',
    paymentLink: 'https://test.cashfree.com/pay/test-session-id',
  }),

  getPaymentStatus: vi.fn().mockResolvedValue({
    orderId: 'test-order-id',
    status: 'PAID',
    transactionId: 'test-transaction-id',
    paymentMethod: 'card',
    amount: 1000,
    currency: 'INR',
  }),

  refund: vi.fn().mockResolvedValue({
    refundId: 'test-refund-id',
    status: 'PROCESSED',
  }),
};

/**
 * Mock for Cashfree callback URL parsing.
 */
export const mockHandleCashfreeCallback = vi.fn(
  (callbackUrl: string): { orderId: string; paymentStatus: string; transactionId?: string } => {
    try {
      const url = new URL(callbackUrl);
      const orderId = url.searchParams.get('order_id') || '';
      const status = url.searchParams.get('status') || '';
      const transactionId = url.searchParams.get('transaction_id') || undefined;

      // Map status to payment status
      const paymentStatus =
        status === 'PAID' ? 'success' :
        status === 'FAILED' ? 'failed' :
        'pending';

      return {
        orderId,
        paymentStatus,
        transactionId,
      };
    } catch {
      return {
        orderId: '',
        paymentStatus: 'pending',
      };
    }
  }
);

// ============================================
// Secure Payment Mock (for payment-secure.ts)
// ============================================

/**
 * Mock for secure payment session creation.
 */
export const mockCreateSecurePaymentSession = vi.fn().mockResolvedValue({
  sessionId: 'test-secure-session-id',
  orderId: 'test-order-id',
  amount: 1000,
  currency: 'INR',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
});

/**
 * Mock for secure payment session retrieval.
 */
export const mockGetSecurePaymentSession = vi.fn().mockResolvedValue({
  sessionId: 'test-secure-session-id',
  orderId: 'test-order-id',
  amount: 1000,
  currency: 'INR',
  status: 'pending',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
});

/**
 * Mock for secure payment processing.
 */
export const mockProcessSecurePayment = vi.fn().mockResolvedValue({
  success: true,
  transactionId: 'test-transaction-id',
  message: 'Payment processed successfully',
});

// ============================================
// Test Helpers
// ============================================

/**
 * Resets all payment mocks.
 * Call this in beforeEach or afterEach hooks.
 */
export function resetPaymentMocks() {
  mockGenerateDummyPaymentSession.mockClear();
  mockGetDummyPaymentSession.mockClear();
  mockProcessPayment.mockClear();
  mockVerifyDummyWebhookSignature.mockClear();
  mockCashfreeSDK.createOrder.mockClear();
  mockCashfreeSDK.getPaymentStatus.mockClear();
  mockCashfreeSDK.refund.mockClear();
  mockHandleCashfreeCallback.mockClear();
  mockCreateSecurePaymentSession.mockClear();
  mockGetSecurePaymentSession.mockClear();
  mockProcessSecurePayment.mockClear();
}

/**
 * Sets up payment mocks to simulate success scenario.
 */
export function setupPaymentSuccess() {
  mockProcessPayment.mockResolvedValue(createMockSuccessResult());
  mockCashfreeSDK.getPaymentStatus.mockResolvedValue({
    orderId: 'test-order-id',
    status: 'PAID',
    transactionId: 'test-transaction-id',
    paymentMethod: 'card',
    amount: 1000,
    currency: 'INR',
  });
}

/**
 * Sets up payment mocks to simulate failure scenario.
 */
export function setupPaymentFailure(message = 'Payment failed') {
  mockProcessPayment.mockResolvedValue(createMockFailureResult(message));
  mockCashfreeSDK.getPaymentStatus.mockResolvedValue({
    orderId: 'test-order-id',
    status: 'FAILED',
    transactionId: undefined,
    paymentMethod: 'card',
    amount: 1000,
    currency: 'INR',
  });
}

/**
 * Sets up payment mocks to simulate pending scenario.
 */
export function setupPaymentPending() {
  mockProcessPayment.mockResolvedValue({
    success: false,
    message: 'Payment is pending',
  });
  mockCashfreeSDK.getPaymentStatus.mockResolvedValue({
    orderId: 'test-order-id',
    status: 'PENDING',
    transactionId: undefined,
    paymentMethod: 'card',
    amount: 1000,
    currency: 'INR',
  });
}

// ============================================
// vi.mock Template
// ============================================

/**
 * Use this template at the top of your test file:
 *
 * ```typescript
 * vi.mock('@/lib/payment', () => ({
 *   generateDummyPaymentSession: mockGenerateDummyPaymentSession,
 *   getDummyPaymentSession: mockGetDummyPaymentSession,
 *   processPayment: mockProcessPayment,
 *   verifyDummyWebhookSignature: mockVerifyDummyWebhookSignature,
 * }));
 *
 * vi.mock('@/lib/cashfree-sdk', () => ({
 *   handleCashfreeCallback: mockHandleCashfreeCallback,
 * }));
 *
 * vi.mock('@/lib/payment-secure', () => ({
 *   createSecurePaymentSession: mockCreateSecurePaymentSession,
 *   getSecurePaymentSession: mockGetSecurePaymentSession,
 *   processSecurePayment: mockProcessSecurePayment,
 * }));
 * ```
 */