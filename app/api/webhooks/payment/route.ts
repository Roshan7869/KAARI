import { NextRequest, NextResponse } from 'next/server';
import { getServerCashfreeConfig } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';
import { z } from 'zod';

// Cashfree PG v2/v3 nested payload schema
// v3 uses `type` and nested data.order / data.payment
// v2 uses `event` and flat data object
// We support both formats for backward compatibility
const CashfreeEventEnum = z.enum([
  'PAYMENT_SUCCESS',
  'PAYMENT_SUCCESS_WEBHOOK',
  'PAYMENT_FAILED',
  'PAYMENT_FAILED_WEBHOOK',
  'PAYMENT_USER_DROPPED_WEBHOOK',
  'ORDER_CREATED',
  'ORDER_PAID_WEBHOOK',
  'ORDER_COMPLETED',
  'PAYMENT_REFUNDED',
  'REFUND_CREATED',
  'REFUND_STATUS_WEBHOOK',
]);

const PaymentWebhookSchema = z.object({
  // v3 uses `type`, v2 uses `event` — accept both
  type: CashfreeEventEnum.optional(),
  event: CashfreeEventEnum.optional(),
  data: z.object({
    // v3 nested structure
    order: z.object({
      order_id: z.string().optional(),
      cf_order_id: z.union([z.string(), z.number()]).optional(),
    }).optional(),
    payment: z.object({
      cf_payment_id: z.union([z.string(), z.number()]).optional(),
      payment_id: z.string().optional(),
      payment_message: z.string().optional(),
    }).optional(),
    // v2 flat structure (fallback)
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    failure_reason: z.string().optional(),
    payment_message: z.string().optional(),
    cf_payment_id: z.union([z.string(), z.number()]).optional(),
  }),
}).refine(
  (v) => v.type !== undefined || v.event !== undefined,
  { message: 'Either type or event must be present' }
);

/**
 * POST /api/webhooks/payment
 * Handle payment webhook from Cashfree (PG v2 and v3)
 * Validates HMAC-SHA256 signature before processing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Read raw body (required for HMAC verification) ────────────────
    const rawBody = await request.text();

    // ── 2. Extract signature & timestamp headers ────────────────────────
    const signature = request.headers.get('x-webhook-signature') ||
                      request.headers.get('x-cf-signature');
    const timestamp = request.headers.get('x-webhook-timestamp') ||
                      request.headers.get('x-webhook-ts') || '';

    // ── 3. Get webhook secret from config ───────────────────────────────
    const cashfreeConfig = await getServerCashfreeConfig();
    const webhookSecret = cashfreeConfig?.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET || '';

    // ── 4. Verify signature ────────────────────────────────────────────
    if (!signature || !webhookSecret) {
      logger.warn('Webhook rejected: missing signature or secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp, webhookSecret);
    if (!isValid) {
      logger.warn('Webhook rejected: invalid signature', { timestamp });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 5. Parse and validate webhook body ────────────────────────────
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = PaymentWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn('Webhook payload validation failed', { errors: parseResult.error.flatten() });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data } = parseResult.data;
    // Normalise: prefer nested v3 fields, fall back to v2 flat fields
    const event = parseResult.data.type ?? parseResult.data.event!;
    const orderId = data.order?.order_id ?? data.order_id;
    const cfPaymentId = String(data.payment?.cf_payment_id ?? data.cf_payment_id ?? data.payment_id ?? '');
    const paymentMessage = data.payment?.payment_message ?? data.payment_message ?? data.failure_reason;

    logger.info('Webhook verified and parsed', { event, order_id: orderId });

    const supabase = createAdminClient();

    // ── 6. Handle different webhook events ──────────────────────────────
    switch (event) {

      // ── ORDER_CREATED: Cashfree created the order, awaiting payment ──
      case 'ORDER_CREATED': {
        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'pending' })
            .eq('order_number', orderId)
            .eq('status', 'pending'); // idempotent — no-op if already set
        }
        logger.info('Order created event', { order_id: orderId });
        break;
      }

      // ── PAYMENT_SUCCESS: Payment successfully received ────────────────
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_SUCCESS_WEBHOOK':
      case 'ORDER_PAID_WEBHOOK': {
        const { error } = await supabase
          .from('cashfree_sessions')
          .update({
            status: 'completed',
            cf_payment_id: cfPaymentId || null,
            updated_at: new Date().toISOString(),
          })
          .eq(orderId ? 'cf_order_id' : 'cf_payment_id', orderId || cfPaymentId);

        if (error) {
          logger.error('Failed to update cashfree_sessions', { error: error.message });
        }

        // Update order status to paid (idempotency: only move from pending)
        if (orderId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('order_number', orderId)
            .maybeSingle();

          if (order && order.status === 'pending') {
            await supabase
              .from('orders')
              .update({ status: 'paid', payment_status: 'paid' })
              .eq('id', order.id);
          }
        }

        logger.info('Payment success processed', { cf_payment_id: cfPaymentId, order_id: orderId });
        break;
      }

      // ── PAYMENT_FAILED: Payment attempted but declined ────────────────
      case 'PAYMENT_FAILED':
      case 'PAYMENT_FAILED_WEBHOOK': {
        await supabase
          .from('cashfree_sessions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq(orderId ? 'cf_order_id' : 'cf_payment_id', orderId || cfPaymentId);

        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'payment_failed', payment_status: 'failed' })
            .eq('order_number', orderId)
            .in('status', ['pending']);
        }

        logger.warn('Payment failed', { cf_payment_id: cfPaymentId, reason: paymentMessage });
        break;
      }

      // ── PAYMENT_USER_DROPPED: User abandoned payment flow ─────────────
      case 'PAYMENT_USER_DROPPED_WEBHOOK': {
        logger.info('User dropped payment flow', { order_id: orderId });
        break;
      }

      // ── REFUND events ─────────────────────────────────────────────────
      case 'PAYMENT_REFUNDED':
      case 'REFUND_CREATED':
      case 'REFUND_STATUS_WEBHOOK': {
        await supabase
          .from('cashfree_sessions')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq(orderId ? 'cf_order_id' : 'cf_payment_id', orderId || cfPaymentId);

        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'refunded' })
            .eq('order_number', orderId);
        }

        logger.info('Payment refunded', { cf_payment_id: cfPaymentId, order_id: orderId });
        break;
      }

      case 'ORDER_COMPLETED': {
        logger.info('Order completed', { order_id: orderId });
        break;
      }

      default:
        logger.info('Unhandled webhook event', { event });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Webhook processing failed', { message: err.message, stack: err.stack });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
