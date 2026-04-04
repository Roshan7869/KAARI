/**
 * Webhook utility functions — HMAC signature validation.
 * Used by API webhook handler and test suite.
 */

export type WebhookProcessResult = {
  success: boolean
  orderId: string
  paymentStatus: string
  message: string
}

/**
 * Validate HMAC-SHA256 webhook signature using constant-time comparison.
 * Supports both base64 (default) and hex encoding.
 * Prevents timing attacks.
 */
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  encoding: 'base64' | 'hex' = 'base64'
): Promise<boolean> {
  try {
    if (!payload || !signature || !secret) return false

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const payloadData = encoder.encode(payload)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData)
    const bytes = Array.from(new Uint8Array(signatureBuffer))

    const computed =
      encoding === 'hex'
        ? bytes.map(b => b.toString(16).padStart(2, '0')).join('')
        : btoa(bytes.map(b => String.fromCharCode(b)).join(''))

    // Constant-time comparison (prevent timing attacks)
    if (computed.length !== signature.length) return false
    let mismatch = 0
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
    }
    return mismatch === 0
  } catch {
    return false
  }
}

// ── Stub exports (actual implementation lives in API route handlers) ───────
// These are exported so tests can import and type-check them.
// The real logic runs server-side in app/api/webhooks/payment/route.ts.

export async function processPaymentWebhook(
  _payload: unknown
): Promise<WebhookProcessResult> {
  throw new Error('processPaymentWebhook must be called from a server route handler')
}

export async function schedulePaymentRetry(
  _orderId: string,
  _retryCount?: number
): Promise<{ success: boolean; message: string }> {
  throw new Error('schedulePaymentRetry must be called from a server route handler')
}

export async function getOrderPaymentStatus(
  _orderId: string
): Promise<Record<string, unknown> | null> {
  throw new Error('getOrderPaymentStatus must be called from a server route handler')
}

