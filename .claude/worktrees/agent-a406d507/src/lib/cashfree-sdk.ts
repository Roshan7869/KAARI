/**
 * Cashfree SDK Integration for UPI Payments
 *
 * This module handles the Cashfree Drop/Checkout SDK integration
 * for UPI-only payments in the Kaari Marketplace.
 *
 * Documentation: https://docs.cashfree.com/docs/sdk-integration
 */

import { supabase } from '@/integrations/supabase/client';

// Cashfree SDK Types
export interface CashfreeSDKConfig {
  paymentSessionId: string;
  mode: 'sandbox' | 'production';
  returnUrl: string;
}

export interface CashfreeSDKResponse {
  order_id: string;
  payment_id: string;
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  payment_method: string;
  payment_amount: number;
  payment_currency: string;
  payment_time: string;
  bank_reference?: string;
  utr?: string;
}

export interface UPIApp {
  id: string;
  name: string;
  icon: string;
  deepLinkPrefix: string;
}

// Popular UPI Apps in India
export const UPI_APPS: UPIApp[] = [
  { id: 'gpay', name: 'Google Pay', icon: '/upi-icons/gpay.png', deepLinkPrefix: 'gpay://upi/pay' },
  { id: 'phonepe', name: 'PhonePe', icon: '/upi-icons/phonepe.png', deepLinkPrefix: 'phonepe://upi/pay' },
  { id: 'paytm', name: 'Paytm', icon: '/upi-icons/paytm.png', deepLinkPrefix: 'paytmmp://upi/pay' },
  { id: 'bhim', name: 'BHIM', icon: '/upi-icons/bhim.png', deepLinkPrefix: 'upi://pay' },
  { id: 'amazonpay', name: 'Amazon Pay', icon: '/upi-icons/amazonpay.png', deepLinkPrefix: 'amazonpay://upi/pay' },
];

// SDK Load State
let sdkLoadPromise: Promise<void> | null = null;

/**
 * Load the Cashfree SDK script dynamically
 */
export async function loadCashfreeSDK(): Promise<void> {
  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.CashfreeSDK || document.querySelector('script[src*="cashfree-sdk"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree-sdk.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('Cashfree SDK loaded successfully');
      resolve();
    };

    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error('Failed to load Cashfree SDK'));
    };

    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Check if Cashfree SDK is loaded
 */
export function isSDKLoaded(): boolean {
  return typeof window.CashfreeSDK !== 'undefined';
}

/**
 * Initialize Cashfree payment
 * Opens the Cashfree Drop/Checkout component
 */
export async function initializeCashfreePayment(config: CashfreeSDKConfig): Promise<CashfreeSDKResponse | null> {
  try {
    await loadCashfreeSDK();

    if (!window.CashfreeSDK) {
      throw new Error('Cashfree SDK failed to initialize');
    }

    // Initialize the SDK with the payment session
    const cashfree = window.CashfreeSDK.init({
      paymentSessionId: config.paymentSessionId,
      mode: config.mode,
    });

    // For UPI payments, we use the Drop component
    const dropConfig = {
      components: ['upi'], // UPI only
      onSuccess: (data: CashfreeSDKResponse) => {
        console.log('Payment successful:', data);
        return data;
      },
      onFailure: (data: CashfreeSDKResponse) => {
        console.error('Payment failed:', data);
        throw new Error(data.payment_status || 'Payment failed');
      },
      onClose: () => {
        console.log('Payment modal closed');
      },
    };

    // Open the payment modal
    await cashfree.drop(dropConfig);

    return null; // Result handled by callbacks
  } catch (error) {
    console.error('Cashfree SDK initialization failed:', error);
    throw error;
  }
}

/**
 * Create UPI intent link for direct app redirection
 * Used when user selects a specific UPI app
 */
export async function createUPIIntent(
  paymentSessionId: string,
  upiApp: UPIApp,
  amount: number
): Promise<string> {
  try {
    await loadCashfreeSDK();

    if (!window.CashfreeSDK) {
      throw new Error('Cashfree SDK failed to initialize');
    }

    const cashfree = window.CashfreeSDK.init({
      paymentSessionId,
      mode: 'sandbox', // Will be determined by config
    });

    // Create UPI intent
    const intentData = await cashfree.createUPIIntent({
      paymentSessionId,
      amount,
      upiId: upiApp.id,
    });

    return intentData.intentLink;
  } catch (error) {
    console.error('Failed to create UPI intent:', error);
    throw error;
  }
}

/**
 * Poll payment status from the server
 * Used as fallback when webhook fails
 */
export async function pollPaymentStatus(
  orderId: string,
  maxAttempts: number = 30,
  intervalMs: number = 3000
): Promise<'completed' | 'failed' | 'pending'> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('status')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Error polling payment status:', error);
      }

      if (payment?.status === 'completed') {
        return 'completed';
      }

      if (payment?.status === 'failed') {
        return 'failed';
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error('Polling error:', error);
      attempts++;
    }
  }

  return 'pending';
}

/**
 * Get payment status with exponential backoff
 */
export async function getPaymentStatusWithBackoff(
  orderId: string,
  onStatusUpdate: (status: string) => void
): Promise<'completed' | 'failed' | 'timeout'> {
  const maxAttempts = 20;
  let delay = 1000; // Start with 1 second
  const maxDelay = 10000; // Max 10 seconds
  const timeout = 15 * 60 * 1000; // 15 minutes timeout

  const startTime = Date.now();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      return 'timeout';
    }

    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('status, external_transaction_id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Status check error:', error);
      }

      if (payment?.status) {
        onStatusUpdate(payment.status);
      }

      if (payment?.status === 'completed') {
        return 'completed';
      }

      if (payment?.status === 'failed') {
        return 'failed';
      }

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelay);
    } catch (error) {
      console.error('Payment status check failed:', error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return 'timeout';
}

/**
 * Handle UPI app deep link redirection
 */
export async function redirectUPIApp(upiApp: UPIApp, paymentSessionId: string): Promise<void> {
  try {
    // Create payment intent and redirect
    const intent = await createUPIIntent(paymentSessionId, upiApp, 0);
    window.location.href = intent;
  } catch (error) {
    console.error('Failed to redirect to UPI app:', error);
    throw error;
  }
}

/**
 * Check if device has UPI apps installed
 */
export async function detectUPIApps(): Promise<string[]> {
  const installedApps: string[] = [];

  // Note: Direct app detection is not possible from browser
  // User will select their preferred UPI app
  return installedApps;
}

/**
 * Verify payment completion on return
 */
export async function verifyPaymentOnReturn(orderId: string): Promise<{
  success: boolean;
  orderStatus: string;
  paymentStatus: string;
}> {
  try {
    // Fetch order and payment status from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error('Failed to verify payment');
    }

    return {
      success: order.payment_status === 'completed',
      orderStatus: order.status,
      paymentStatus: order.payment_status || 'unknown',
    };
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
}

/**
 * Handle Cashfree callback/redirect
 * Parse the callback parameters and verify the payment
 */
export async function handleCashfreeCallback(url: string): Promise<{
  orderId: string;
  paymentStatus: 'success' | 'failed' | 'pending';
  transactionId?: string;
}> {
  const urlObj = new URL(url);
  const orderId = urlObj.searchParams.get('order_id') || '';
  const paymentStatus = urlObj.searchParams.get('status') || 'pending';
  const transactionId = urlObj.searchParams.get('transaction_id') || undefined;

  return {
    orderId,
    paymentStatus: paymentStatus === 'PAID' ? 'success' : paymentStatus === 'FAILED' ? 'failed' : 'pending',
    transactionId,
  };
}

// Type declarations for Cashfree SDK
declare global {
  interface Window {
    CashfreeSDK?: {
      init: (config: { paymentSessionId: string; mode: string }) => {
        drop: (config: {
          components: string[];
          onSuccess: (data: CashfreeSDKResponse) => void;
          onFailure: (data: CashfreeSDKResponse) => void;
          onClose: () => void;
        }) => Promise<void>;
        createUPIIntent: (config: { paymentSessionId: string; amount: number; upiId: string }) => Promise<{ intentLink: string }>;
      };
    };
  }
}

export default {
  loadCashfreeSDK,
  isSDKLoaded,
  initializeCashfreePayment,
  createUPIIntent,
  pollPaymentStatus,
  getPaymentStatusWithBackoff,
  redirectUPIApp,
  detectUPIApps,
  verifyPaymentOnReturn,
  handleCashfreeCallback,
  UPI_APPS,
};