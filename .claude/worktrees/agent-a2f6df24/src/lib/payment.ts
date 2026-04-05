/**
 * Dummy Payment Service
 * Simulates payment gateway integrations (Razorpay, Stripe, etc.)
 * For development/testing purposes only
 *
 * SECURITY WARNING: This file uses client-side sessionStorage for dummy payments.
 * In production, ALL payment sessions should be stored server-side with:
 * - Proper authentication
 * - Session ownership verification
 * - Amount verification against database records
 * - Server-side session management
 */

export interface DummyPaymentSession {
  session_id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  expires_at: string;
  user_id?: string; // SECURITY: Track session ownership
}

export interface DummyPaymentConfig {
  simulateFailure?: boolean;
  failureRate?: number; // 0-1, percentage of payments to fail
  processingDelayMs?: number; // Simulate network delay
}

// Persistence across reloads using sessionStorage
// SECURITY WARNING: In production, use server-side session storage
const SESSION_STORAGE_KEY = 'kaari_dummy_payment_sessions';

function getStorageMap(): Record<string, DummyPaymentSession> {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveStorageMap(map: Record<string, DummyPaymentSession>) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(map));
}

/**
 * Generate a cryptographically secure session ID
 * Uses Web Crypto API for secure random generation
 */
function generateSecureSessionId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `dummy_pay_${crypto.randomUUID()}`;
  }

  // Fallback: Use crypto.getRandomValues() for secure random bytes
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Last resort fallback (should not happen in modern browsers)
    console.warn('SECURITY: Using Math.random() fallback - not cryptographically secure');
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hex string
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `dummy_pay_${hex}`;
}

/**
 * Create a dummy payment session
 * Returns a session ID that can be used to process payment
 *
 * SECURITY WARNING: In production, this should be server-side!
 */
export function generateDummyPaymentSession(
  orderId: string,
  amount: number,
  paymentMethod: string,
  config: DummyPaymentConfig = {}
): DummyPaymentSession {
  // SECURITY: Use cryptographically secure session ID
  const sessionId = generateSecureSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min expiry

  const session: DummyPaymentSession = {
    session_id: sessionId,
    order_id: orderId,
    amount,
    currency: 'INR',
    payment_method: paymentMethod,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const map = getStorageMap();
  map[sessionId] = session;
  saveStorageMap(map);

  return session;
}

/**
 * Get payment session details
 */
export function getDummyPaymentSession(
  sessionId: string
): DummyPaymentSession | null {
  const map = getStorageMap();
  return map[sessionId] || null;
}

/**
 * Simulate payment processing
 * This is called at the dummy payment gateway page before user proceeds
 */
export async function processPayment(
  sessionId: string,
  config: DummyPaymentConfig = {}
): Promise<{
  success: boolean;
  transactionId: string;
  message: string;
}> {
  const { processingDelayMs = 1500, failureRate = 0 } = config;

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, processingDelayMs));

  const map = getStorageMap();
  const session = map[sessionId];
  if (!session) {
    return {
      success: false,
      transactionId: '',
      message: 'Payment session not found or expired',
    };
  }

  // Check expiry
  if (new Date() > new Date(session.expires_at)) {
    delete map[sessionId];
    saveStorageMap(map);
    return {
      success: false,
      transactionId: '',
      message: 'Payment session expired',
    };
  }

  // Simulate random failures
  const shouldFail = Math.random() < failureRate;
  if (shouldFail) {
    session.status = 'failed';
    map[sessionId] = session;
    saveStorageMap(map);
    return {
      success: false,
      transactionId: `txn_failed_${Date.now()}`,
      message: 'Payment failed. Please try again.',
    };
  }

  // Success
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  session.status = 'success';
  map[sessionId] = session;
  saveStorageMap(map);

  return {
    success: true,
    transactionId,
    message: 'Payment processed successfully',
  };
}

/**
 * Get payment status by transaction ID
 * Used by webhook or polling mechanisms
 */
export function getPaymentStatus(transactionId: string): DummyPaymentSession | null {
  const map = getStorageMap();
  for (const session of Object.values(map)) {
    // In real implementation, would query from DB using external transaction ID
    // This is a simplified lookup
    if (session.session_id.includes(transactionId.split('_')[1] || '')) {
      return session;
    }
  }
  return null;
}

/**
 * Cleanup expired sessions
 * Should be called periodically via cron job
 */
export function cleanupExpiredSessions(): number {
  let cleanup_count = 0;
  const now = new Date();
  const map = getStorageMap();

  for (const [sessionId, session] of Object.entries(map)) {
    if (new Date(session.expires_at) < now) {
      delete map[sessionId];
      cleanup_count++;
    }
  }

  if (cleanup_count > 0) {
    saveStorageMap(map);
  }

  return cleanup_count;
}

/**
 * Generate payment gateway redirect URL (for dummy payment page)
 */
export function generatePaymentPageUrl(
  sessionId: string,
  returnUrl?: string
): string {
  // In production, this would be Razorpay/Stripe URL
  // For dummy, we use a local page
  const params = new URLSearchParams({
    session_id: sessionId,
  });
  if (returnUrl) {
    params.append('return_url', returnUrl);
  }
  return `/dummy-payment?${params.toString()}`;
}

/**
 * Verify webhook signature
 * For dummy payments, just verify session exists
 */
export function verifyDummyWebhookSignature(
  sessionId: string,
  signature?: string
): boolean {
  const map = getStorageMap();
  const session = map[sessionId];
  if (!session) return false;

  // In production with real payment gateways:
  // return crypto
  //   .createHmac('sha256', WEBHOOK_SECRET)
  //   .update(JSON.stringify(payload))
  //   .digest('hex') === signature;

  return true;
}

/**
 * Create payment record in database
 * Should be called by webhook handler
 */
export interface PaymentWebhookPayload {
  session_id: string;
  order_id: string;
  status: 'completed' | 'failed';
  transaction_id: string;
  timestamp: string;
}

export function buildPaymentWebhook(
  session: DummyPaymentSession,
  transactionId: string
): PaymentWebhookPayload {
  return {
    session_id: session.session_id,
    order_id: session.order_id,
    status: session.status === 'success' ? 'completed' : 'failed',
    transaction_id: transactionId,
    timestamp: new Date().toISOString(),
  };
}
