import { logger } from '@/lib/logger';
/**
 * Secure Payment Service
 * Uses server-side database sessions instead of client-side sessionStorage
 * SECURITY: Prevents session manipulation and amount tampering
 */

import { supabase } from './supabase/client';

// Type definitions for RPC responses
interface CreatePaymentSessionResponse {
  session_id: string;
  order_id: string;
  amount: string | number;
  currency: string;
  expires_at: string;
}

interface VerifyPaymentSessionResponse {
  valid: boolean;
  session_id: string;
  order_id: string;
  amount: string | number;
  status: string;
  error: string | null;
}

interface CompletePaymentSessionResponse {
  success: boolean;
  order_id: string;
  message: string;
}

export interface SecurePaymentSession {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export interface PaymentSessionValidation {
  valid: boolean;
  sessionId?: string;
  orderId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

/**
 * Create a secure payment session stored in the database
 * SECURITY: Validates order ownership and amount before creating session
 */
export async function createSecurePaymentSession(
  orderId: string,
  amount: number,
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod'
): Promise<{ success: boolean; session?: SecurePaymentSession; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Call database function to create session with validation
    const { data, error } = await supabase.rpc('create_payment_session', {
      p_order_id: orderId,
      p_user_id: user.id,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_expires_in_minutes: 15
    });

    if (error) {
      logger.error('Failed to create payment session:', error);

      // Parse specific error messages
      if (error.message.includes('Order not found')) {
        return { success: false, error: 'Order not found' };
      }
      if (error.message.includes('does not belong')) {
        return { success: false, error: 'You are not authorized to pay for this order' };
      }
      if (error.message.includes('cannot accept payment')) {
        return { success: false, error: 'This order cannot accept payment' };
      }
      if (error.message.includes('Amount mismatch')) {
        return { success: false, error: 'Payment amount does not match order total' };
      }

      return { success: false, error: 'Failed to create payment session' };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'Invalid response from payment service' };
    }

    const result = data[0] as unknown as CreatePaymentSessionResponse;

    return {
      success: true,
      session: {
        sessionId: result.session_id,
        orderId: result.order_id,
        amount: typeof result.amount === 'number' ? result.amount : parseFloat(String(result.amount)),
        currency: result.currency,
        expiresAt: result.expires_at
      }
    };
  } catch (err) {
    logger.error('Payment session creation error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Verify a payment session against the database
 * SECURITY: Validates session exists, hasn't expired, and belongs to user
 */
export async function verifySecurePaymentSession(
  sessionId: string,
  requireOwnership: boolean = true
): Promise<PaymentSessionValidation> {
  try {
    const response = await fetch('/api/payment-session/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, requireOwnership }),
    });

    const data = await response.json() as PaymentSessionValidation;
    return data;
  } catch (err) {
    logger.error('Session verification error:', err);
    return { valid: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete a payment session (called by webhook after successful payment)
 * SECURITY: Updates session status in database to prevent replay attacks
 */
export async function completeSecurePaymentSession(
  sessionId: string,
  transactionId: string,
  status: 'completed' | 'failed'
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const response = await fetch('/api/payment-session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, transactionId, status }),
    });

    const data = await response.json() as { success: boolean; orderId?: string; error?: string };
    return data;
  } catch (err) {
    logger.error('Session completion error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get payment session details from database
 * SECURITY: Only returns session if it belongs to the current user (verified server-side)
 */
export async function getSecurePaymentSession(
  sessionId: string
): Promise<{ success: boolean; session?: SecurePaymentSession & { status: string; paymentMethod: string }; error?: string }> {
  try {
    const response = await fetch(`/api/payment-session?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json() as { success: boolean; session?: SecurePaymentSession & { status: string; paymentMethod: string }; error?: string };

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Payment session not found' };
    }

    return data;
  } catch (err) {
    logger.error('Get session error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Process payment for a session (for dummy/development payments)
 * SECURITY: Verifies session ownership and amount against database
 */
export async function processSecurePayment(
  sessionId: string,
  config?: { processingDelayMs?: number; failureRate?: number }
): Promise<{ success: boolean; transactionId?: string; message: string; orderId?: string }> {
  const { processingDelayMs = 1500, failureRate = 0 } = config || {};

  // Verify session first
  const verification = await verifySecurePaymentSession(sessionId, true);

  if (!verification.valid) {
    return {
      success: false,
      message: verification.error || 'Invalid payment session'
    };
  }

  // Simulate network delay
  if (processingDelayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, processingDelayMs));
  }

  // Simulate random failures (for testing)
  if (Math.random() < failureRate) {
    return {
      success: false,
      message: 'Payment failed (simulated). Please try again.'
    };
  }

  // Generate transaction ID
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Mark session as completed
  const completion = await completeSecurePaymentSession(sessionId, transactionId, 'completed');

  if (!completion.success) {
    return {
      success: false,
      message: completion.error || 'Failed to process payment'
    };
  }

  return {
    success: true,
    transactionId,
    message: 'Payment processed successfully',
    orderId: completion.orderId
  };
}

/**
 * Create a payment session and get redirect URL
 * This is the main entry point for starting a payment flow
 *
 * If Cashfree gateway is configured and active, routes through Cashfree.
 * Otherwise falls back to dummy payment system for development.
 */
export async function initiatePayment(
  orderId: string,
  amount: number,
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' | 'online' | 'cod'
): Promise<{ success: boolean; sessionId?: string; redirectUrl?: string; error?: string }> {
  // Normalize payment method
  const normalizedMethod = paymentMethod === 'online' ? 'upi' : paymentMethod;

  // For COD, we don't need a payment session
  if (normalizedMethod === 'cod') {
    return { success: true, redirectUrl: `/order-confirmation/${orderId}` };
  }

  // Create secure session in database
  const result = await createSecurePaymentSession(orderId, amount, normalizedMethod as 'upi' | 'card' | 'netbanking' | 'wallet');

  if (!result.success || !result.session) {
    return { success: false, error: result.error };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.KAARI_BASE_URL?.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

      const { data, error } = await supabase.functions.invoke('cashfree-payment', {
        body: {
          action: 'create-order',
          orderId,
          amount,
          customerName: session.user.user_metadata?.full_name || session.user.email || 'Kaari Customer',
          customerEmail: session.user.email || 'customer@kaari.in',
          customerPhone: session.user.user_metadata?.phone || '9999999999',
          returnUrl: `${appUrl}/payment?session_id=${result.session.sessionId}`,
          notifyUrl: `${appUrl}/api/webhooks/payment`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const cfSessionId =
        (data as { data?: { payment_session_id?: string } })?.data?.payment_session_id;

      if (!error && cfSessionId) {
        return {
          success: true,
          sessionId: result.session.sessionId,
          redirectUrl: `/payment?session_id=${result.session.sessionId}&cf_session_id=${encodeURIComponent(cfSessionId)}`,
        };
      }

      const fallbackResponse = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount,
          customerName: session.user.user_metadata?.full_name || session.user.email || 'Kaari Customer',
          customerEmail: session.user.email || 'customer@kaari.in',
          customerPhone: session.user.user_metadata?.phone || '9999999999',
          returnUrl: `${appUrl}/payment?session_id=${result.session.sessionId}`,
          notifyUrl: `${appUrl}/api/webhooks/payment`,
        }),
      });

      const fallbackData = fallbackResponse.ok
        ? await fallbackResponse.json() as { data?: { payment_session_id?: string } }
        : null;
      const directCashfreeSessionId = fallbackData?.data?.payment_session_id;

      if (directCashfreeSessionId) {
        return {
          success: true,
          sessionId: result.session.sessionId,
          redirectUrl: `/payment?session_id=${result.session.sessionId}&cf_session_id=${encodeURIComponent(directCashfreeSessionId)}`,
        };
      }
    }
  } catch {
    logger.warn('Failed to create Cashfree payment session, using secure fallback');
  }

  // Fallback: Dummy payment for development
  return {
    success: true,
    sessionId: result.session.sessionId,
    redirectUrl: `/payment?session_id=${result.session.sessionId}`,
  };
}
