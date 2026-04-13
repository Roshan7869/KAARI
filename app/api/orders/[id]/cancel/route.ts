import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * POST /api/orders/[id]/cancel
 *
 * User-initiated order cancellation.
 * - Only the order owner can cancel.
 * - Only orders in "pending" or "paid" status within 24 hours can be cancelled.
 * - If payment was completed, sets payment_status to "refund_pending".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const cancellationReason = typeof body.cancellation_reason === 'string'
      ? body.cancellation_reason.slice(0, 500)
      : null;

    const admin = createAdminClient();

    // ── 1. Fetch order and verify ownership ─────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: fetchError } = await (admin as any)
      .from('orders')
      .select('id, user_id, status, created_at')
      .eq('id', orderId)
      .single() as { data: { id: string; user_id: string; status: string; created_at: string } | null; error: Error | null };

    if (fetchError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // ── 2. Verify the order belongs to the authenticated user ────────
    if (order.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // ── 3. Only allow cancellation of pending or paid orders within 24h ─
    const allowedStatuses = ['pending', 'paid'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel order with status "${order.status}". Only pending or paid orders can be cancelled.` },
        { status: 400 }
      );
    }

    const createdTime = new Date(order.created_at).getTime();
    const hoursSinceCreation = (Date.now() - createdTime) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return NextResponse.json(
        { success: false, error: 'Orders can only be cancelled within 24 hours of placement.' },
        { status: 400 }
      );
    }

    // ── 4. Update order status to "cancelled" ───────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin as any)
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason || 'User cancelled order',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId) as { error: Error | null };

    if (updateError) {
      logger.error('Failed to cancel order', { error: updateError.message, orderId });
      return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
    }

    // ── 5. If order was paid, mark payment for refund ───────────────
    if (order.status === 'paid') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: paymentUpdateError } = await (admin as any)
        .from('payments')
        .update({ status: 'refund_pending' })
        .eq('order_id', orderId)
        .in('status', ['captured', 'completed', 'created']) as { error: Error | null };

      if (paymentUpdateError) {
        // Log but don't fail — order is already cancelled
        logger.warn('Failed to update payment status to refund_pending', {
          error: paymentUpdateError.message,
          orderId,
        });
      }
    }

    // ── 6. Log status event ─────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: eventError } = await (admin as any)
      .from('order_status_events')
      .insert({
        order_id: orderId,
        new_status: 'cancelled',
        note: cancellationReason || 'User cancelled order',
        actor_user_id: userId,
      }) as { error: Error | null };

    if (eventError) {
      logger.warn('Failed to log cancellation event', { error: eventError.message, orderId });
    }

    logger.info('Order cancelled by user', { orderId, userId, previousStatus: order.status });

    return NextResponse.json({
      success: true,
      data: {
        id: orderId,
        status: 'cancelled',
        message: 'Order has been cancelled successfully.',
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Cancel order failed', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to cancel order' },
      { status: 500 }
    );
  }
}