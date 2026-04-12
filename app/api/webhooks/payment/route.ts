import { NextRequest, NextResponse } from 'next/server';
import { getServerCashfreeConfig, verifyCashfreeWebhookSignature } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyRateLimit } from '@/lib/server-rate-limit';
import { z } from 'zod';
import { waitUntil } from '@vercel/functions';

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
// Background processing function for webhook events
// This processes the actual business logic AFTER returning 200 to Cashfree
async function processWebhookInBackground(params: {
  event: string;
  orderId: string | undefined;
  cfPaymentId: string;
  cashfreeSessionId: string | null;
  paymentMessage: string | undefined;
  webhookEventId: string;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const { event, orderId, cfPaymentId, cashfreeSessionId, paymentMessage, webhookEventId, supabase } = params;
  let eventResult: Record<string, unknown> = {};

  try {
    // Process different webhook events asynchronously
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
        logger.info('Order created event processed', { order_id: orderId });
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
            .select('id, status, user_id, cart_id, total_amount')
            .eq('order_number', orderId)
            .maybeSingle();

          if (order && ['pending', 'payment_pending', 'placed'].includes(order.status)) {
            await supabase
              .from('orders')
              .update({ status: 'paid', payment_status: 'paid' })
              .eq('id', order.id);
            eventResult = { newStatus: 'paid', oldStatus: order.status };

            // Insert payment record for financial reconciliation
            if (cfPaymentId) {
              const { error: paymentInsertError } = await supabase
                .from('payments')
                .insert({
                  order_id: order.id,
                  amount: order.total_amount ?? 0,
                  currency: 'INR',
                  status: 'completed',
                  provider: 'cashfree',
                  external_transaction_id: cfPaymentId,
                });
              if (paymentInsertError) {
                logger.error('Failed to insert payment record on webhook success', {
                  error: paymentInsertError.message,
                  orderId: order.id,
                  cfPaymentId,
                });
              }
            }

            // Queue order confirmation email
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', order.user_id)
              .maybeSingle();

            if (userProfile?.email) {
              await supabase
                .from('email_queue')
                .insert({
                  order_id: order.id,
                  type: 'order_confirmation',
                  recipient: userProfile.email,
                  status: 'PENDING'
                });
            }

            // Clear the specific cart that was checked out (never delete ALL user carts)
            if (order.cart_id) {
              await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', order.cart_id);
            } else {
              // FIX-PY2: No cart_id on order — log warning instead of deleting ALL user carts
              logger.warn('Cannot clear cart: order has no cart_id', { orderId: order.id, userId: order.user_id });
            }
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

        logger.warn('Payment failed processed', { cf_payment_id: cfPaymentId, reason: paymentMessage });
        break;
      }

      // ── PAYMENT_USER_DROPPED: User abandoned payment flow ─────────────
      case 'PAYMENT_USER_DROPPED_WEBHOOK': {
        eventResult = { message: 'User dropped payment flow' };
        logger.info('User dropped payment flow processed', { order_id: orderId });
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
          // Guard: only allow refund from valid states (prevents replay attacks)
          const REFUNDABLE_STATUSES = ['payment_confirmed', 'paid', 'processing', 'packed', 'shipped', 'delivered'];
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('order_number', orderId)
            .maybeSingle();

          if (order && REFUNDABLE_STATUSES.includes(order.status)) {
            // Optimistic lock: only update if status hasn't changed
            await supabase
              .from('orders')
              .update({ status: 'refunded', payment_status: 'refunded' })
              .eq('id', order.id)
              .eq('status', order.status);
            eventResult = { newStatus: 'refunded', oldStatus: order.status };
          } else {
            logger.warn('Refund rejected: invalid state transition', {
              orderId,
              currentStatus: order?.status,
            });
            eventResult = { message: 'Refund rejected: invalid order state' };
          }
        }

        logger.info('Payment refunded processed', { cf_payment_id: cfPaymentId, order_id: orderId });
        break;
      }

      case 'ORDER_COMPLETED': {
        eventResult = { message: 'Order completed' };
        logger.info('Order completed processed', { order_id: orderId });
        break;
      }

      default:
        logger.info('Unhandled webhook event processed', { event });
    }

    // Update webhook event status to PROCESSED
    if (webhookEventId) {
      await supabase
        .from('webhook_events')
        .update({
          status: 'PROCESSED',
          result: { ...eventResult, timestamp: new Date().toISOString() },
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEventId);
    }

  } catch (error) {
    const err = error as Error;
    logger.error('Background webhook processing failed', {
      message: err.message,
      stack: err.stack,
      eventId: webhookEventId,
      event,
      orderId,
      cfPaymentId
    });

    // Update webhook event status to FAILED
    if (webhookEventId) {
      await supabase
        .from('webhook_events')
        .update({
          status: 'FAILED',
          error: err.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEventId);
    }
  }
}

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

    // ── 4.1 Verify timestamp freshness (prevent replay attacks) ────────
    const timestampNum = parseInt(timestamp, 10);
    const currentTime = Date.now();

    // Reject webhooks older than 5 minutes (300,000 ms) or from the future
    if (isNaN(timestampNum) || !timestamp) {
      logger.warn('Webhook rejected: missing or invalid timestamp', { timestamp });
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }
    if (timestampNum > currentTime + 30000) {
      logger.warn('Webhook rejected: future timestamp', { timestamp, currentTime });
      return NextResponse.json({ error: 'Future timestamp' }, { status: 400 });
    }
    if (currentTime - timestampNum > 300000) {
      logger.warn('Webhook rejected: stale timestamp', {
        timestamp,
        currentTime,
        ageMs: currentTime - timestampNum,
        maxAllowedAge: 300000
      });
      return NextResponse.json({ error: 'Stale webhook' }, { status: 400 });
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

    // ── 6. Atomic deduplication via webhook_events table ─────────────
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

    // ── 7. Handle different webhook events (MOVED TO BACKGROUND) ──────────
    // All heavy processing now happens AFTER we return 200 to Cashfree
    // This prevents timeouts and duplicate webhook deliveries

    // ── 8. Atomic INSERT for deduplication + event logging ────────────
    // Record webhook receipt BEFORE doing any heavy work.
    // Atomic INSERT catches duplicate key violations (no TOCTOU race).
    // FIX-PY1: Process webhook if we have EITHER session ID or payment ID (OR logic, not AND)
    if (cashfreeSessionId || cfPaymentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertedEvent, error: insertError } = await (supabase as any)
        .from('webhook_events')
        .insert({
          cf_payment_id: cfPaymentId || null,
          event_type: event,
          order_id: cashfreeSessionId ?? null,
          status: 'RECEIVED',
          received_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        // Postgres unique_violation (code 23505) = already processed
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          logger.info('Webhook duplicate skipped (atomic dedup)', { cf_payment_id: cfPaymentId, event });
          return NextResponse.json({ received: true, duplicate: true });
        }
        logger.error('Failed to record webhook receipt', { error: insertError.message, event });
      } else if (insertedEvent) {
        // Use waitUntil so Vercel keeps the container alive until processing completes
        waitUntil(processWebhookInBackground({
          event,
          orderId,
          cfPaymentId,
          cashfreeSessionId,
          paymentMessage,
          webhookEventId: insertedEvent.id,
          supabase,
        }).catch(error => {
          logger.error('Background webhook processing failed', {
            error: error.message,
            eventId: insertedEvent.id,
            event,
            orderId,
            cfPaymentId
          });
        }));
      }
    }

    // IMMEDIATELY return 200 to Cashfree BEFORE doing any heavy processing
    // This prevents Cashfree from timing out (5s limit) and retrying
    logger.info('Webhook received and queued for processing', {
      event,
      order_id: orderId,
      cf_payment_id: cfPaymentId
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    const err = error as Error;
    logger.error('Webhook processing failed', { message: err.message, stack: err.stack });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
