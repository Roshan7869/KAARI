import { NextRequest, NextResponse } from 'next/server';
import { getServerCashfreeConfig } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';
import { z } from 'zod';

// Webhook payload validation schema — all Cashfree event types
const PaymentWebhookSchema = z.object({
  event: z.enum([
    // Payment states
    'PAYMENT_SUCCESS',
    'PAYMENT_SUCCESS_WEBHOOK',
    'PAYMENT_FAILED',
    'PAYMENT_FAILED_WEBHOOK',
    'PAYMENT_USER_DROPPED_WEBHOOK',
    // Order states
    'ORDER_CREATED',
    'ORDER_PAID_WEBHOOK',
    'ORDER_COMPLETED',
    // Refund states
    'PAYMENT_REFUNDED',
    'REFUND_CREATED',
    'REFUND_STATUS_WEBHOOK',
  ]),
  data: z.object({
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    failure_reason: z.string().optional(),
    payment_message: z.string().optional(),
    cf_payment_id: z.string().optional(),
  }),
});

/**
 * POST /api/webhooks/payment
 * Handle payment webhook from Cashfree
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp, webhookSecret);
    if (!isValid) {
      logger.warn('Webhook rejected: invalid signature', { timestamp });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { event, data } = parseResult.data;
    logger.info('Webhook verified and parsed', { event, order_id: data.order_id });

    const supabase = createAdminClient();

    // ── 6. Handle different webhook events ──────────────────────────────
    switch (event) {

      // ── ORDER_CREATED: Cashfree created the order, awaiting payment ──
      case 'ORDER_CREATED': {
        if (data.order_id) {
          await supabase
            .from('orders')
            .update({ status: 'pending' })
            .eq('order_number', data.order_id)
            .eq('status', 'pending'); // idempotent — no-op if already set
        }
        logger.info('Order created event', { order_id: data.order_id });
        break;
      }

      // ── PAYMENT_SUCCESS: Payment successfully received ────────────────
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_SUCCESS_WEBHOOK':
      case 'ORDER_PAID_WEBHOOK': {
        const paymentId = data.cf_payment_id ?? data.payment_id;

        const { error } = await supabase
          .from('cashfree_sessions')
          .update({
            status: 'completed',
            cf_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq(data.order_id ? 'cf_order_id' : 'cf_payment_id', data.order_id || paymentId || '');

        if (error) {
          logger.error('Failed to update cashfree_sessions', { error: error.message });
        }

        // Update order status to paid (idempotency: only move from pending)
        if (data.order_id) {
          const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('order_number', data.order_id)
            .maybeSingle();

          if (order && order.status === 'pending') {
            await supabase
              .from('orders')
              .update({ status: 'paid', payment_status: 'paid' })
              .eq('id', order.id);
          }
        }

        logger.info('Payment success processed', { payment_id: paymentId, order_id: data.order_id });
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
          .eq(data.order_id ? 'cf_order_id' : 'cf_payment_id', data.order_id || data.payment_id || '');

        // Also update order status so UI can show payment failed state
        if (data.order_id) {
          await supabase
            .from('orders')
            .update({
              status: 'payment_failed',
              payment_status: 'failed',
            })
            .eq('order_number', data.order_id)
            .in('status', ['pending']); // only move from pending
        }

        logger.warn('Payment failed', {
          payment_id: data.payment_id,
          reason: data.failure_reason ?? data.payment_message,
        });
        break;
      }

      // ── PAYMENT_USER_DROPPED: User abandoned payment flow ─────────────
      case 'PAYMENT_USER_DROPPED_WEBHOOK': {
        // Keep order as PENDING — a cleanup cron handles expiry after timeout
        logger.info('User dropped payment flow', { order_id: data.order_id });
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
          .eq(data.order_id ? 'cf_order_id' : 'cf_payment_id', data.order_id || data.payment_id || '');

        if (data.order_id) {
          await supabase
            .from('orders')
            .update({ status: 'refunded' })
            .eq('order_number', data.order_id);
        }

        logger.info('Payment refunded', { payment_id: data.payment_id, order_id: data.order_id });
        break;
      }

      // ── ORDER_COMPLETED ───────────────────────────────────────────────
      case 'ORDER_COMPLETED': {
        logger.info('Order completed', { order_id: data.order_id });
        break;
      }

      default:
        logger.info('Unhandled webhook event', { event });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Webhook processing failed', { message: err.message, stack: err.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
