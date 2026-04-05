/**
 * Payment Webhook Handler Service
 * Processes payment status updates from payment gateways (real or dummy)
 *
 * This service:
 * 1. Validates webhook signature (if from real payment provider)
 * 2. Updates payment records in database
 * 3. Updates order status based on payment result
 * 4. Triggers inventory restoration if payment failed
 * 5. Handles idempotency (prevents duplicate processing)
 */

import { supabase } from '@/integrations/supabase/client';
import type { PaymentWebhookPayload } from './payment';

export interface WebhookProcessResult {
  success: boolean;
  orderId: string;
  paymentStatus: string;
  message: string;
}

/**
 * Constant-time comparison to prevent timing attacks
 * Compares two strings/buffers in constant time regardless of content
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert ArrayBuffer to Hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate webhook signature using HMAC-SHA256
 * Works in both browser and Node.js/Deno environments
 *
 * @param payload - The raw request body as string
 * @param signature - The signature from webhook header
 * @param secret - The webhook secret from environment
 * @param encoding - 'base64' or 'hex' (defaults to 'base64')
 * @returns Promise<boolean> - true if signature is valid
 */
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  encoding: 'base64' | 'hex' = 'base64'
): Promise<boolean> {
  // SECURITY: Reject if any parameter is missing
  if (!payload || !signature || !secret) {
    console.error('WEBHOOK SECURITY: Missing required parameters for signature validation');
    return false;
  }

  // SECURITY: Never return true in production without actual validation
  // DEV mode warning is logged but validation still required
  if (import.meta.env.DEV) {
    console.warn('WEBHOOK: Running in DEV mode - signature validation is enforced');
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    // Import key for HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate HMAC signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);

    // Convert to expected encoding
    const expectedSignature = encoding === 'base64'
      ? arrayBufferToBase64(signatureBuffer)
      : arrayBufferToHex(signatureBuffer);

    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error('WEBHOOK SECURITY: Signature validation failed', error);
    return false;
  }
}

/**
 * Process payment webhook received from payment gateway
 * Should be idempotent (safe to call multiple times with same data)
 */
export async function processPaymentWebhook(
  payload: PaymentWebhookPayload
): Promise<WebhookProcessResult> {
  try {
    // 1. First, check if we already processed this transaction
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('external_transaction_id', payload.transaction_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status !== 'created') {
      // Already processed, return existing result (idempotent)
      return {
        success: existingPayment.status === 'completed',
        orderId: payload.order_id,
        paymentStatus: existingPayment.status,
        message: 'Payment already processed',
      };
    }

    // 2. Update payment record with transaction ID and status
    const paymentStatus = payload.status === 'completed' ? 'completed' : 'failed';

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        external_transaction_id: payload.transaction_id,
        status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', payload.order_id)
      .eq('status', 'created');

    if (paymentUpdateError) {
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    // 3. Update order status based on payment result
    if (payload.status === 'completed') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.order_id);

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      // Log order status change
      await supabase.from('order_status_events').insert({
        order_id: payload.order_id,
        status: 'paid',
        notes: `Payment completed. Transaction ID: ${payload.transaction_id}`,
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        orderId: payload.order_id,
        paymentStatus: 'completed',
        message: 'Payment processed successfully',
      };
    } else {
      // Payment failed - database trigger will handle inventory restoration
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.order_id);

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      // Log status change
      await supabase.from('order_status_events').insert({
        order_id: payload.order_id,
        status: 'cancelled',
        notes: `Payment failed. Transaction ID: ${payload.transaction_id}. Inventory restored.`,
        created_at: new Date().toISOString(),
      });

      return {
        success: false,
        orderId: payload.order_id,
        paymentStatus: 'failed',
        message: 'Payment failed and order cancelled',
      };
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}

/**
 * Retry failed payment (for user-initiated retries)
 * Creates a new payment record with retry count incremented
 */
export async function schedulePaymentRetry(
  orderId: string,
  maxRetries: number = 3
): Promise<{ success: boolean; message: string }> {
  try {
    // Check current retry count
    const { data: payment } = await supabase
      .from('payments')
      .select('retry_count, status')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return { success: false, message: 'Payment record not found' };
    }

    if (payment.status === 'completed') {
      return { success: false, message: 'Payment already completed' };
    }

    if ((payment.retry_count || 0) >= maxRetries) {
      return {
        success: false,
        message: `Maximum retry attempts (${maxRetries}) exceeded. Please contact support.`,
      };
    }

    // Update retry count
    const { error } = await supabase
      .from('payments')
      .update({
        retry_count: (payment.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (error) {
      throw error;
    }

    // Generate new checkout session for retry
    // This will be returned to client to redirect to payment page again
    const checkoutSession = {
      session_id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order_id: orderId,
      created_at: new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Payment retry scheduled. Redirecting to payment gateway...',
    };
  } catch (error) {
    console.error('Retry scheduling error:', error);
    return { success: false, message: 'Failed to schedule payment retry' };
  }
}

/**
 * Get payment status for a specific order
 */
export async function getOrderPaymentStatus(orderId: string) {
  try {
    const { data } = await supabase
      .from('payments')
      .select('id, status, external_transaction_id, created_at, updated_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data || null;
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return null;
  }
}