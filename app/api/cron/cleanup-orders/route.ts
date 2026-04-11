import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerCashfreeConfig } from '@/lib/cashfree-server';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/cleanup-orders
 * Cron job to clean up stuck PENDING orders
 * Runs every 15 minutes via Vercel Cron
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron access attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const cashfreeConfig = await getServerCashfreeConfig();

    if (!cashfreeConfig) {
      logger.error('Cashfree configuration not found');
      return NextResponse.json({ error: 'Cashfree not configured' }, { status: 500 });
    }

    // Find stuck orders (>30 min pending, <7 days old)
    const { data: stuckOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, created_at, order_number')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 minutes ago
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Less than 7 days old

    if (fetchError) {
      logger.error('Failed to fetch stuck orders', { error: fetchError.message });
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (!stuckOrders || stuckOrders.length === 0) {
      return NextResponse.json({ checked: 0, recovered: 0, message: 'No stuck orders found' });
    }

    let recovered = 0;

    // Process each stuck order
    for (const order of stuckOrders) {
      try {
        // Check actual status with Cashfree
        const baseUrl = cashfreeConfig.isTestMode
          ? 'https://sandbox.cashfree.com/pg'
          : 'https://api.cashfree.com/pg';

        const response = await fetch(`${baseUrl}/orders/${order.order_number}`, {
          headers: {
            'x-api-version': '2023-08-01',
            'x-client-id': cashfreeConfig.appId,
            'x-client-secret': cashfreeConfig.secretKey,
          }
        });

        if (!response.ok) {
          logger.warn('Failed to fetch order status from Cashfree', {
            orderId: order.id,
            status: response.status
          });
          continue;
        }

        const cashfreeOrder = await response.json();

        if (cashfreeOrder.order_status === 'PAID' || cashfreeOrder.payment_status === 'SUCCESS') {
          // Webhook missed, process now
          // This would normally trigger our internal webhook processor
          // For now, we'll simulate the success handling
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          recovered++;
          logger.info('Recovered stuck order', { orderId: order.id });
        }
        else if (cashfreeOrder.order_status === 'EXPIRED' || cashfreeOrder.payment_status === 'FAILED') {
          // Mark as failed
          await supabase
            .from('orders')
            .update({
              status: 'failed',
              payment_status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          // Restore stock for failed orders
          await restoreStockForOrder(order.id, supabase);
          logger.info('Marked expired order as failed', { orderId: order.id });
        }
        // For still pending orders, leave them be

      } catch (error) {
        logger.error('Cleanup failed for order', {
          orderId: order.id,
          error: (error as Error).message
        });
      }
    }

    return NextResponse.json({
      checked: stuckOrders.length,
      recovered,
      message: `Checked ${stuckOrders.length} orders, recovered ${recovered}`
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Cron job failed', { message: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper function to restore stock for failed/cancelled orders
async function restoreStockForOrder(orderId: string, supabase: ReturnType<typeof createAdminClient>) {
  try {
    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) {
      logger.error('Failed to fetch order items for stock restoration', {
        orderId,
        error: itemsError.message
      });
      return;
    }

    // Restore stock for each item
    for (const item of items || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('increment_product_stock', {
        product_id: item.product_id,
        quantity: item.quantity
      });
    }

    logger.info('Stock restored for order', { orderId });
  } catch (error) {
    logger.error('Failed to restore stock for order', {
      orderId,
      error: (error as Error).message
    });
  }
}