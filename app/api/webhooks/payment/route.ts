import { NextRequest, NextResponse } from 'next/server';
import { getServerCashfreeConfig } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';
import { applyRateLimit } from '@/lib/server-rate-limit';
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
 * Validates HMAC-SHA256 signature before processing.
 * All events are deduplicated via the webhook_events table.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit: 200 requests / 1 min per IP (DDoS protection; Cashfree retries are expected)
    const rateLimitResponse = await applyRateLimit(request, 'webhook', false);
    if (rateLimitResponse) return rateLimitResponse;

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

    // ── 6. Global idempotency check via webhook_events table ─────────────
    // All events (not just SUCCESS) are deduplicated here.
    // First, look up the cashfree_session for this payment.
    let cashfreeSessionId: string | null = null;

    if (cfPaymentId || orderId) {
      const { data: session } = await supabase
        .from('cashfree_sessions')
        .select('id, status')
        .eq(orderId ? 'cf_order_id' : 'cf_payment_id', orderId || cfPaymentId)
        .maybeSingle();

      cashfreeSessionId = session?.id ?? null;
    }

    // Check webhook_events for deduplication (only if we have session + payment ID)
    if (cashfreeSessionId && cfPaymentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingEvent } = await (supabase as any)
        .from('webhook_events')
        .select('id')
        .eq('cf_payment_id', cfPaymentId)
        .eq('event_type', event)
        .eq('cashfree_session_id', cashfreeSessionId)
        .maybeSingle();

      if (existingEvent) {
        logger.info('Webhook duplicate skipped (webhook_events)', { cf_payment_id: cfPaymentId, event });
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // ── 7. Handle different webhook events ──────────────────────────────
    let eventResult: Record<string, unknown> = {};

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
        eventResult = { newStatus: 'pending', message: 'Order created' };
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
          logger.error('Failed to update cashfree_sessions on success', { error: error.message });
        }

        // Update order status to paid (only move forward, never backward)
        if (orderId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('order_number', orderId)
            .maybeSingle();

          if (order && ['pending', 'payment_pending', 'placed'].includes(order.status)) {
            await supabase
              .from('orders')
              .update({ status: 'paid', payment_status: 'paid' })
              .eq('id', order.id);
            eventResult = { newStatus: 'paid', oldStatus: order.status };
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
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('order_number', orderId)
            .maybeSingle();

          // Only update if still in a pre-payment state
          if (order && ['pending', 'payment_pending', 'placed'].includes(order.status)) {
            await supabase
              .from('orders')
              .update({ status: 'payment_failed', payment_status: 'failed' })
              .eq('id', order.id);
            eventResult = { newStatus: 'payment_failed', oldStatus: order.status };
          }
        }

        logger.warn('Payment failed', { cf_payment_id: cfPaymentId, reason: paymentMessage });
        break;
      }

      // ── PAYMENT_USER_DROPPED: User abandoned payment flow ─────────────
      case 'PAYMENT_USER_DROPPED_WEBHOOK': {
        eventResult = { message: 'User dropped payment flow' };
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

        eventResult = { newStatus: 'refunded' };
        logger.info('Payment refunded', { cf_payment_id: cfPaymentId, order_id: orderId });
        break;
      }

      case 'ORDER_COMPLETED': {
        eventResult = { message: 'Order completed' };
        logger.info('Order completed', { order_id: orderId });
        break;
      }

      default:
        logger.info('Unhandled webhook event', { event });
    }

    // ── 8. Log event to webhook_events (idempotency store) ────────────────
    if (cashfreeSessionId && cfPaymentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: logError } = await (supabase as any)
        .from('webhook_events')
        .insert({
          cf_payment_id: cfPaymentId,
          event_type: event,
          cashfree_session_id: cashfreeSessionId,
          result: { ...eventResult, timestamp: new Date().toISOString() },
          received_at: new Date().toISOString(),
        });

      if (logError && !logError.message.includes('duplicate')) {
        // Unique constraint violation = already logged (duplicate delivery) — safe to ignore
        logger.error('Failed to log webhook event', { error: logError.message, event });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const err = error as Error;
    logger.error('Webhook processing failed', { message: err.message, stack: err.stack });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
