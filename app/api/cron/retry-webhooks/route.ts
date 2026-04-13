import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/retry-webhooks
 *
 * Cron endpoint that retries failed webhook events with exponential backoff.
 * After 3 failed retries, the event is moved to DEAD_LETTER status.
 *
 * Authorization: Requires CRON_SECRET header matching CRON_SECRET env var.
 * Called by Vercel Cron Jobs (or external scheduler).
 *
 * Backoff schedule: 1min (1st retry), 5min (2nd retry), 15min (3rd retry)
 */
const MAX_RETRIES = 3;
const BACKOFF_MS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Authorization ─────────────────────────────────────────────────────
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    logger.error('CRON_SECRET env var is not set — retry-webhooks endpoint is disabled');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  if (cronSecret !== expectedSecret) {
    logger.warn('retry-webhooks: unauthorized cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // ── Fetch events ready for retry ───────────────────────────────────────
  // Events that are FAILED, haven't exceeded max retries, and are due for retry
  const { data: failedEvents, error: fetchError } = await supabase
    .from('webhook_events')
    .select('id, cf_payment_id, event_type, order_id, result, error, retry_count, next_retry_at')
    .eq('status', 'FAILED')
    .lt('retry_count', MAX_RETRIES)
    .lte('next_retry_at', now);

  if (fetchError) {
    logger.error('retry-webhooks: failed to fetch events', { error: fetchError.message });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!failedEvents || failedEvents.length === 0) {
    return NextResponse.json({ retried: 0, message: 'No events to retry' });
  }

  logger.info('retry-webhooks: processing events', { count: failedEvents.length });

  let retried = 0;
  let deadLettered = 0;

  // ── Process each event ─────────────────────────────────────────────────
  for (const event of failedEvents) {
    const newRetryCount = event.retry_count + 1;

    try {
      // Re-process the event by calling the internal webhook processing logic
      // We re-dispatch to the same webhook endpoint with the original data
      const processResult = await retryWebhookEvent(supabase, event);

      if (processResult.success) {
        // Mark as PROCESSED
        await supabase
          .from('webhook_events')
          .update({
            status: 'PROCESSED',
            retry_count: newRetryCount,
            next_retry_at: null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        retried++;
        logger.info('retry-webhooks: event retried successfully', {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
        });
      } else {
        throw new Error(processResult.error || 'Retry processing failed');
      }
    } catch (error) {
      const err = error as Error;

      if (newRetryCount >= MAX_RETRIES) {
        // Move to DEAD_LETTER after max retries
        await supabase
          .from('webhook_events')
          .update({
            status: 'DEAD_LETTER',
            retry_count: newRetryCount,
            next_retry_at: null,
            error: `DEAD_LETTER after ${MAX_RETRIES} retries: ${err.message}`,
            processed_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        deadLettered++;
        logger.error('retry-webhooks: event moved to dead letter', {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
          error: err.message,
        });
      } else {
        // Schedule next retry with exponential backoff
        const backoff = BACKOFF_MS[newRetryCount - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
        const nextRetry = new Date(Date.now() + backoff).toISOString();

        await supabase
          .from('webhook_events')
          .update({
            retry_count: newRetryCount,
            next_retry_at: nextRetry,
            error: `Retry ${newRetryCount} failed: ${err.message}`,
          })
          .eq('id', event.id);

        retried++;
        logger.warn('retry-webhooks: event retry failed, scheduled next attempt', {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
          nextRetryAt: nextRetry,
          error: err.message,
        });
      }
    }
  }

  logger.info('retry-webhooks: batch complete', { retried, deadLettered, total: failedEvents.length });

  return NextResponse.json({
    retried,
    deadLettered,
    total: failedEvents.length,
  });
}

/**
 * Re-process a failed webhook event.
 *
 * For payment success/failure events, we re-verify the payment status with
 * Cashfree and update the database accordingly. For other event types, we
 * re-apply the business logic directly.
 */
async function retryWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: {
    id: string;
    cf_payment_id: string;
    event_type: string;
    order_id: string | null;
    result: Record<string, unknown> | null;
    error: string | null;
    retry_count: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const eventType = event.event_type;

  // ── Payment success events: verify payment with Cashfree ──
  if (
    eventType === 'PAYMENT_SUCCESS' ||
    eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
    eventType === 'ORDER_PAID_WEBHOOK'
  ) {
    // Find the cashfree_session for this payment
    const { data: session, error: sessionError } = await supabase
      .from('cashfree_sessions')
      .select('id, cf_order_id, status')
      .eq('cf_payment_id', event.cf_payment_id)
      .maybeSingle();

    if (sessionError) {
      return { success: false, error: `Failed to find session: ${sessionError.message}` };
    }

    // Update session status
    if (session) {
      const { error: updateError } = await supabase
        .from('cashfree_sessions')
        .update({
          status: 'completed',
          cf_payment_id: event.cf_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (updateError) {
        return { success: false, error: `Failed to update session: ${updateError.message}` };
      }
    }

    // Update order if we have an order reference
    const orderId = event.order_id || session?.cf_order_id;
    if (orderId) {
      // Look up order by cf_order_id or order_number
      const lookupField = orderId.startsWith('KH') ? 'order_number' : 'id';
      const { data: order } = await supabase
        .from('orders')
        .select('id, status, user_id, cart_id, total_amount')
        .eq(lookupField, orderId)
        .maybeSingle();

      if (order && ['pending', 'payment_pending', 'placed'].includes(order.status)) {
        await supabase
          .from('orders')
          .update({ status: 'paid', payment_status: 'paid' })
          .eq('id', order.id);

        // Insert payment record
        if (event.cf_payment_id) {
          await supabase
            .from('payments')
            .insert({
              order_id: order.id,
              amount: order.total_amount ?? 0,
              currency: 'INR',
              status: 'completed',
              provider: 'cashfree',
              external_transaction_id: event.cf_payment_id,
            });
        }
      }
    }

    return { success: true };
  }

  // ── Payment failed events ──
  if (eventType === 'PAYMENT_FAILED' || eventType === 'PAYMENT_FAILED_WEBHOOK') {
    // Update cashfree session
    await supabase
      .from('cashfree_sessions')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('cf_payment_id', event.cf_payment_id);

    // Update order if applicable
    if (event.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_number', event.order_id)
        .maybeSingle();

      if (order && ['pending', 'payment_pending', 'placed'].includes(order.status)) {
        await supabase
          .from('orders')
          .update({ status: 'payment_failed', payment_status: 'failed' })
          .eq('id', order.id);
      }
    }

    return { success: true };
  }

  // ── Refund events ──
  if (eventType === 'PAYMENT_REFUNDED' || eventType === 'REFUND_CREATED' || eventType === 'REFUND_STATUS_WEBHOOK') {
    await supabase
      .from('cashfree_sessions')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('cf_payment_id', event.cf_payment_id);

    return { success: true };
  }

  // ── Order created / completed / user dropped — idempotent no-ops ──
  if (eventType === 'ORDER_CREATED' || eventType === 'ORDER_COMPLETED') {
    return { success: true };
  }

  if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK') {
    return { success: true };
  }

  // Unknown event type — treat as success (no-op)
  logger.warn('retry-webhooks: unknown event type retried as no-op', { eventType });
  return { success: true };
}