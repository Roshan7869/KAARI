/**
 * Cashfree Payment Gateway Integration
 * Documentation: https://docs.cashfree.com/
 *
 * Supports: UPI, Cards, NetBanking, Wallets, EMI, Pay Later
 * Currency: INR (Indian Rupees)
 *
 * SECURITY: This module MUST only be imported in server-side code.
 * It contains API credentials (appId, secretKey, webhookSecret)
 * that must NEVER be exposed to the client bundle.
 * The 'server-only' import ensures a build-time error if imported client-side.
 */

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { config as appConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { fetchWithRetry } from '@/lib/fetch-with-timeout';

// Cashfree API Configuration
export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  isTestMode: boolean;
  webhookSecret: string;
}

// Cashfree Order Response
export interface CashfreeOrder {
  order_id: string;          // Our internal order ID
  cf_order_id: string;       // Cashfree's order ID
  order_status: string;      // ACTIVE, PAID, EXPIRED, etc.
  order_amount: number;
  order_currency: string;
  order_note?: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta?: {
    return_url?: string;
    notify_url?: string;
    payment_methods?: string;
  };
  payments?: {
    cf_payment_id: string;
    payment_status: string;
    payment_amount: number;
    payment_currency: string;
    payment_time: string;
    bank_reference?: string;
  }[];
}

// Cashfree Payment Session
export interface CashfreePaymentSession {
  cf_order_id: string;
  payment_session_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  payment_link?: string;      // URL to redirect user
  payments?: CashfreePayment[];
}

// Cashfree Payment Details
export interface CashfreePayment {
  cf_payment_id: string;
  order_id: string;
  payment_status: string;     // SUCCESS, FAILED, PENDING, CANCELLED
  payment_amount: number;
  payment_currency: string;
  payment_time: string;
  payment_method?: string;
  bank_reference?: string;
  utr?: string;
  payment_message?: string;
  payment_group?: string;
}

// Cashfree Webhook Payload
export interface CashfreeWebhookPayload {
  type: string;               // PAYMENT_SUCCESS_WEBHOOK, etc.
  data: {
    order: {
      order_id: string;
      cf_order_id: string;
      order_status: string;
      order_amount: number;
      order_currency: string;
    };
    payment?: CashfreePayment;
    customer_details?: {
      customer_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
    };
  };
}

// Type for our database Cashfree session
export interface DbCashfreeSession {
  id: string;
  order_id: string;
  checkout_session_id?: string;
  cf_order_id?: string;
  cf_payment_session_id?: string;
  cf_payment_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  return_url?: string;
  notify_url?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  paid_at?: string;
  raw_response?: Record<string, unknown>;
}

// Get Cashfree configuration from environment variables (server-side only)
function getCashfreeConfig(): CashfreeConfig | null {
  const appId       = process.env.CASHFREE_APP_ID;
  const secretKey   = process.env.CASHFREE_SECRET_KEY;
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

  if (!appId || !secretKey || !webhookSecret) {
    logger.warn('Cashfree gateway not configured (missing env vars), using dummy mode');
    return null;
  }

  const isTestMode = (process.env.CASHFREE_TEST_MODE?.trim() ?? 'true') !== 'false';

  if (isTestMode) {
    logger.warn(
      '[Cashfree] Running in SANDBOX mode. ' +
      'Set CASHFREE_TEST_MODE=false in production env to enable live payments.'
    );
  }

  return {
    appId,
    secretKey,
    isTestMode,
    webhookSecret,
  };
}

// Get Cashfree API base URL based on mode
function getCashfreeBaseUrl(isTestMode: boolean): string {
  return isTestMode
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';
}

/**
 * Create a Cashfree order and get payment session
 * NOTE: Only UPI payment method is supported as per business requirements
 */
export async function createCashfreeOrder(params: {
  orderId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<CashfreePaymentSession> {
  const config = getCashfreeConfig();

  // If no Cashfree config, return dummy session
  if (!config || !config.appId || !config.secretKey) {
    logger.info('Using dummy payment session (Cashfree not configured)');
    return createDummySession(params);
  }

  const baseUrl = getCashfreeBaseUrl(config.isTestMode);
  const orderId = `KH${params.orderId.slice(0, 8)}`; // Prefix for Cashfree

  // UPI ONLY - No other payment methods supported
  const UPI_PAYMENT_METHOD = 'upi';

  const orderPayload = {
    order_id: orderId,
    order_amount: params.amount,
    order_currency: params.currency || 'INR',
    order_note: `Kaari Order ${params.orderId.slice(0, 8)}`,
    customer_details: {
      customer_id: params.orderId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      payment_methods: UPI_PAYMENT_METHOD, // UPI only - cards/netbanking/wallet disabled
    },
  };

  try {
    const response = await fetchWithRetry(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create Cashfree order');
    }

    const data = await response.json();

    // Store session in database (server-side, use admin client)
    const admin = createAdminClient();
    await admin.from('cashfree_sessions').insert({
      order_id: params.orderId,
      cf_order_id: data.cf_order_id,
      cf_payment_session_id: data.payment_session_id,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'created',
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      customer_name: params.customerName,
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      raw_response: data,
    });

    return {
      cf_order_id: data.cf_order_id,
      payment_session_id: data.payment_session_id,
      order_id: orderId,
      order_amount: params.amount,
      order_currency: params.currency || 'INR',
      order_status: 'ACTIVE',
      customer_details: orderPayload.customer_details,
      payment_link: `${appConfig.appUrl}/pay/${data.payment_session_id}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('timed out')) {
      logger.error('Cashfree order creation timed out after 10s (retry mechanism applied)', {
        error: errorMessage,
        orderPayload: {
          order_id: params.orderId,
          amount: params.amount,
          customer_email: params.customerEmail
        }
      });
      // Return a more user-friendly error
      throw new Error('Payment gateway timeout. Please try again in a moment.');
    } else {
      logger.error('Cashfree order creation failed:', error);
      throw error;
    }
  }
}

/**
 * Get payment session status
 */
export async function getCashfreePaymentSession(
  sessionId: string
): Promise<CashfreePaymentSession | null> {
  const config = getCashfreeConfig();
  if (!config) {
    return null;
  }

  const baseUrl = getCashfreeBaseUrl(config.isTestMode);

  try {
    const response = await fetchWithRetry(`${baseUrl}/orders/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('timed out')) {
      logger.error('Cashfree session fetch timed out after 10s (retry mechanism applied)', {
        error: errorMessage,
        sessionId: sessionId
      });
    } else {
      logger.error('Failed to get Cashfree session:', error);
    }
    return null;
  }
}

/**
 * Get payment details for an order
 */
export async function getCashfreePaymentDetails(
  cfOrderId: string
): Promise<CashfreePayment | null> {
  const config = getCashfreeConfig();
  if (!config) {
    return null;
  }

  const baseUrl = getCashfreeBaseUrl(config.isTestMode);

  try {
    const response = await fetchWithRetry(`${baseUrl}/orders/${cfOrderId}/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Return the most recent payment
    if (data.payments && data.payments.length > 0) {
      return data.payments[0];
    }
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('timed out')) {
      logger.error('Cashfree payment details fetch timed out after 10s (retry mechanism applied)', {
        error: errorMessage,
        cfOrderId: cfOrderId
      });
    } else {
      logger.error('Failed to get Cashfree payment details:', error);
    }
    return null;
  }
}

/**
 * NOTE: Webhook signature verification has been moved to lib/cashfree-server.ts
 * which uses the 'server-only' guard and Node.js crypto module directly.
 * Use `verifyCashfreeWebhookSignature` from '@/lib/cashfree-server' in API routes.
 */

/**
 * Create a dummy session when Cashfree is not configured
 * Used for development/testing
 */
function createDummySession(params: {
  orderId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}): CashfreePaymentSession {
  const sessionId = `dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    cf_order_id: `order_${params.orderId.slice(0, 8)}`,
    payment_session_id: sessionId,
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: params.currency || 'INR',
    order_status: 'ACTIVE',
    customer_details: {
      customer_id: params.orderId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    payment_link: `/dummy-payment?session_id=${sessionId}&return_url=${encodeURIComponent(params.returnUrl)}`,
  };
}

/**
 * Generate Cashfree checkout URL
 * Returns the URL to redirect the user for payment
 *
 * SECURITY: This function does NOT expose any API keys.
 * The payment session is created server-side via getCashfreeConfig().
 * For dummy sessions, we use local dummy payment page.
 */
export function getCashfreeCheckoutUrl(
  paymentSessionId: string,
  returnUrl?: string,
  isTestMode: boolean = true // Default to test mode for safety
): string {
  // Check if we're in dummy mode (session starts with 'dummy_')
  if (paymentSessionId.startsWith('dummy_')) {
    let url = `/dummy-payment?session_id=${paymentSessionId}`;
    if (returnUrl) {
      url += `&return_url=${encodeURIComponent(returnUrl)}`;
    }
    return url;
  }

  // For real Cashfree sessions, redirect to Cashfree's hosted checkout
  // The actual payment happens on Cashfree's hosted page
  // Test mode determines which Cashfree environment to use
  const baseUrl = isTestMode
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

  return `${baseUrl}/checkout?payment_session_id=${paymentSessionId}`;
}

/**
 * Get checkout URL asynchronously (preferred method)
 * Fetches the test mode setting from database config
 */
export async function getCashfreeCheckoutUrlAsync(
  paymentSessionId: string,
  returnUrl?: string
): Promise<string> {
  // For dummy sessions, use sync version
  if (paymentSessionId.startsWith('dummy_')) {
    return getCashfreeCheckoutUrl(paymentSessionId, returnUrl);
  }

  // Fetch config to determine test mode
  const config = getCashfreeConfig();
  const isTestMode = config?.isTestMode ?? true; // Default to test mode if no config

  return getCashfreeCheckoutUrl(paymentSessionId, returnUrl, isTestMode);
}

/**
 * SECURITY IMPORTANT:
 *
 * Cashfree API secrets should NEVER be exposed to the client-side.
 * All API calls that require the secret key should go through:
 * 1. Next.js API routes (server-side, Node.js environment)
 * 2. Environment variables: CASHFREE_APP_ID, CASHFREE_SECRET_KEY (server-only)
 *
 * NEVER expose CASHFREE_SECRET_KEY on the client (no NEXT_PUBLIC_ prefix).
 * getCashfreeConfig() reads from process.env and returns null client-side,
 * gracefully degrading to dummy mode in that context.
 */

export default {
  createCashfreeOrder,
  getCashfreePaymentSession,
  getCashfreePaymentDetails,
  getCashfreeCheckoutUrl,
  getCashfreeCheckoutUrlAsync,
};