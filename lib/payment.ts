'use client';

/**
 * Payment utilities (client-side).
 *
 * Provides helpers for dummy-payment flow and session management.
 * Real Cashfree integration happens server-side via /api/payments/* routes.
 */

export interface PaymentSessionResult {
  success: boolean;
  session?: {
    sessionId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    expiresAt: string;
  } | null;
  error?: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  orderId?: string;
  transactionId?: string;
  message?: string;
}

export interface InitiatePaymentResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function getSecurePaymentSession(
  sessionId: string
): Promise<PaymentSessionResult> {
  try {
    const res = await fetch(`/api/payment-session?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to load session' }));
      return { success: false, error: data.error || 'Failed to load session' };
    }
    const data = await res.json();
    return {
      success: true,
      session: {
        sessionId: data.sessionId || sessionId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        status: data.status,
        paymentMethod: data.paymentMethod,
        expiresAt: data.expiresAt,
      },
    };
  } catch {
    return { success: false, error: 'Failed to load payment session' };
  }
}

export async function processSecurePayment(
  _sessionId: string,
  options?: { processingDelayMs?: number; failureRate?: number }
): Promise<ProcessPaymentResult> {
  const delay = options?.processingDelayMs ?? 500;
  const failRate = options?.failureRate ?? 0;

  await new Promise((resolve) => setTimeout(resolve, delay));

  if (Math.random() * 100 < failRate) {
    return { success: false, message: 'Payment failed. Please try again.' };
  }

  return {
    success: true,
    transactionId: `txn_${Date.now()}`,
  };
}

export async function initiatePayment(
  orderId: string,
  _amount: number,
  _method: string
): Promise<InitiatePaymentResult> {
  try {
    const res = await fetch('/api/payment-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, payment_method: _method }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to initiate payment' }));
      return { success: false, error: data.error || 'Failed to initiate payment' };
    }
    const data = await res.json();
    return {
      success: true,
      redirectUrl: data.redirectUrl || `/payment?session_id=${data.sessionId}`,
    };
  } catch {
    return { success: false, error: 'Failed to initiate payment' };
  }
}
