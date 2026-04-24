import 'server-only'

import crypto from 'crypto'
import { createAdminClient, hasAdminClientConfig } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger-server'
import { fetchWithRetry } from '@/lib/fetch-with-timeout'

export interface ServerCashfreeConfig {
  appId: string
  secretKey: string
  isTestMode: boolean
  webhookSecret: string
}

type PaymentGatewayRow = {
  api_key: string | null
  api_secret: string | null
  webhook_secret: string | null
  is_test_mode: boolean | null
}

function getEnvCashfreeConfig(): ServerCashfreeConfig {
  const mode = (process.env.CASHFREE_MODE || 'sandbox').trim().toLowerCase()
  const isProduction = mode === 'production'

  if (isProduction) {
    const appId = (process.env.CASHFREE_APP_ID_PROD || '').trim()
    const secretKey = (process.env.CASHFREE_SECRET_KEY_PROD || '').trim()

    if (!appId || !secretKey) {
      throw new Error(
        'CASHFREE_APP_ID_PROD and CASHFREE_SECRET_KEY_PROD must be set when CASHFREE_MODE=production. ' +
        'Using sandbox credentials in production is a security violation.'
      )
    }

    return {
      appId,
      secretKey,
      isTestMode: false,
      webhookSecret: (process.env.CASHFREE_WEBHOOK_SECRET || '').trim(),
    }
  }

  const appId = (process.env.CASHFREE_APP_ID || '').trim()
  const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim()

  return {
    appId,
    secretKey,
    isTestMode: true,
    webhookSecret: (process.env.CASHFREE_WEBHOOK_SECRET || '').trim(),
  }
}

async function getDatabaseCashfreeConfig(): Promise<PaymentGatewayRow | null> {
  if (!hasAdminClientConfig()) {
    return null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('api_key, api_secret, webhook_secret, is_test_mode')
    .eq('provider', 'cashfree')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function getServerCashfreeConfig(): Promise<ServerCashfreeConfig | null> {
  const envConfig = getEnvCashfreeConfig()
  const needsDatabaseLookup =
    !envConfig.appId || !envConfig.secretKey || !envConfig.webhookSecret

  if (!needsDatabaseLookup) {
    return envConfig
  }

  const dbConfig = await getDatabaseCashfreeConfig()
  const mergedConfig: ServerCashfreeConfig = {
    appId: envConfig.appId || dbConfig?.api_key || '',
    secretKey: envConfig.secretKey || dbConfig?.api_secret || '',
    isTestMode: dbConfig?.is_test_mode ?? envConfig.isTestMode,
    webhookSecret: envConfig.webhookSecret || dbConfig?.webhook_secret || '',
  }

  if (!mergedConfig.appId || !mergedConfig.secretKey) {
    return null
  }

  return mergedConfig
}

export function getCashfreeBaseUrl(isTestMode: boolean): string {
  return isTestMode ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'
}

/**
 * Verify Cashfree webhook signature (server-only).
 * Validates HMAC-SHA256 signature with timing-safe comparison.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  if (!secret || !signature) {
    logger.warn('WEBHOOK: Missing secret or signature');
    return false;
  }

  try {
    const signedPayload = timestamp + rawBody;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    // Timing-safe comparison prevents timing attacks
    if (sigBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Get Cashfree payment details (server-only, uses admin client).
 * Fetches from Cashfree API using server credentials.
 */
export async function getCashfreePaymentDetailsServer(
  cfOrderId: string
): Promise<{ cf_payment_id: string; payment_status: string; payment_amount: number } | null> {
  const config = await getServerCashfreeConfig();
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
    if (data.payments && data.payments.length > 0) {
      const payment = data.payments[0];
      return {
        cf_payment_id: String(payment.cf_payment_id || payment.payment_id || ''),
        payment_status: payment.payment_status || 'UNKNOWN',
        payment_amount: payment.payment_amount || 0,
      };
    }
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get Cashfree payment details (server):', { error: errorMessage, cfOrderId });
    return null;
  }
}

// ── Checkout URL helpers ────────────────────────────────────────────

export function getCashfreeCheckoutUrl(
  paymentSessionId: string,
  returnUrl?: string,
  isTestMode: boolean = true
): string {
  if (paymentSessionId.startsWith('dummy_')) {
    let url = `/dummy-payment?session_id=${paymentSessionId}`;
    if (returnUrl) {
      url += `&return_url=${encodeURIComponent(returnUrl)}`;
    }
    return url;
  }

  const baseUrl = isTestMode
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

  return `${baseUrl}/checkout?payment_session_id=${paymentSessionId}`;
}

export async function getCashfreeCheckoutUrlAsync(
  paymentSessionId: string,
  returnUrl?: string
): Promise<string> {
  if (paymentSessionId.startsWith('dummy_')) {
    return getCashfreeCheckoutUrl(paymentSessionId, returnUrl);
  }

  const config = await getServerCashfreeConfig();
  const isTestMode = config?.isTestMode ?? true;

  return getCashfreeCheckoutUrl(paymentSessionId, returnUrl, isTestMode);
}
