import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger';
import { OrderStatusUpdateSchema, OrderCancelSchema } from '@/lib/validations/checkout.schema';
import type { Database } from '@/types/database';

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Type helper for Supabase query responses
type SupabaseResponse<T> = { data: T | null; error: null } | { data: null; error: Error };

/**
 * GET /api/orders
 * GET /api/orders/[id]
 * Get orders for current user or get order by ID
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { pathname } = new URL(request.url);

    // Check if this is a request for a specific order
    const pathParts = pathname.split('/').filter(Boolean);
    const orderId = pathParts[pathParts.length - 1];

    if (orderId && orderId !== 'orders') {
      // Get single order by ID
      return getOrderByID(supabase, orderId);
    }

    // Get orders list with pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get user ID from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get orders with count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ordersResult = await (supabase as any)
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as { data: Database['public']['Tables']['orders']['Row'][] | null; error: Error | null; count?: number };

    if (ordersResult.error) {
      throw ordersResult.error;
    }
    const orders = ordersResult.data as Database['public']['Tables']['orders']['Row'][];
    const count = ordersResult.count || 0;

    // Get order items for each order
    const orderIds = orders?.map((o: { id: string }) => o.id) || [];
    let orderItems: Array<Record<string, unknown>> = [];
    if (orderIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsResult = await (supabase as any)
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          variant_id,
          quantity,
          unit_price,
          line_total,
          product:product_id (id, title, slug, base_price, media:product_media (id, url, sort_order))
        `)
        .in('order_id', orderIds) as { data: Array<Record<string, unknown>> | null; error: Error | null };

      if (itemsResult.error) {
        throw itemsResult.error;
      }
      orderItems = (itemsResult.data || []) as Array<Record<string, unknown>>;
    }

    // Group items by order
    const ordersWithItems = (orders || []).map((order) => ({
      ...order,
      items: orderItems.filter((item) => item.order_id === order.id),
    }));

    logger.debug('Orders list', { count, page, limit });

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get orders', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}

async function getOrderByID(supabase: Supabase, id: string): Promise<NextResponse> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Get order
  const orderResult = await supabase
    .from('orders')
    .select(`
      *,
      user:profiles!inner (id, full_name),
      items:order_items (
        id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        line_total,
        product:product_id (id, title, slug, base_price, media:product_media (id, url, sort_order))
      ),
      payment:payment_sessions (id, gateway, status, amount, transaction_id, created_at),
      shipment:shipments (id, tracking_number, carrier, status, created_at, updated_at)
    `)
    .eq('id', id)
    .single();

  if (orderResult.error) {
    throw orderResult.error;
  }
  const order = orderResult.data as Database['public']['Tables']['orders']['Row'] & {
    user?: { id: string; full_name: string };
    items?: Array<Record<string, unknown>>;
    payment?: Record<string, unknown>;
    shipment?: Record<string, unknown>;
  };

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }

  // Check ownership
  if (order.user_id !== user.id && order.user?.id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }

  // Get order status events
  const statusEventsResult = await supabase
    .from('order_status_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  if (statusEventsResult.error) {
    throw statusEventsResult.error;
  }
  const statusEvents = statusEventsResult.data as Database['public']['Tables']['order_status_events']['Row'][];

  logger.debug('Order detail', { orderId: id });

  return NextResponse.json({
    success: true,
    data: {
      ...order,
      status_events: statusEvents || [],
    },
  });
}

/**
 * POST /api/orders/[id]/cancel
 * POST /api/orders/[id]/status
 * Cancel order or update order status
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { pathname } = new URL(request.url);
    const pathParts = pathname.split('/').filter(Boolean);

    // Find the order ID (second-to-last or last segment depending on action)
    let id: string | null = null;
    let action: 'cancel' | 'status' | null = null;

    if (pathParts[pathParts.length - 1] === 'cancel') {
      id = pathParts[pathParts.length - 2] || null;
      action = 'cancel';
    } else if (pathParts[pathParts.length - 1] === 'status') {
      id = pathParts[pathParts.length - 2] || null;
      action = 'status';
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      );
    }

    if (action === 'cancel') {
      return cancelOrder(supabase, id, request);
    }

    if (action === 'status') {
      return updateOrderStatus(supabase, id, request);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to process order request', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process order request',
      },
      { status: 500 }
    );
  }
}

async function cancelOrder(supabase: Supabase, id: string, request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const result = OrderCancelSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: result.error.errors,
      },
      { status: 400 }
    );
  }

  const { cancellation_reason } = result.data;

  // Get user ID from session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Get order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderResult = await (supabase as any)
    .from('orders')
    .select('id, user_id, status')
    .eq('id', id)
    .single() as { data: { id: string; user_id: string; status: string } | null; error: Error | null };

  if (orderResult.error || !orderResult.data) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }
  const order = orderResult.data as { id: string; user_id: string; status: string };

  // Check ownership
  if (order.user_id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }

  // Check if order can be cancelled
  const cancellableStatuses = ['pending', 'paid', 'processing'];
  if (!cancellableStatuses.includes(order.status)) {
    return NextResponse.json(
      { success: false, error: `Cannot cancel order with status: ${order.status}` },
      { status: 400 }
    );
  }

  // Update order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateResult = await (supabase as any)
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id) as { error: Error | null };

  if (updateResult.error) {
    throw updateResult.error;
  }

  // Log cancellation event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logResult = await (supabase as any)
    .from('order_status_events')
    .insert({
      order_id: id,
      new_status: 'cancelled',
      note: cancellation_reason || 'User cancelled order',
      actor_user_id: user.id,
    }) as { error: Error | null };

  if (logResult.error) {
    throw logResult.error;
  }

  logger.info('Order cancelled', { orderId: id, reason: cancellation_reason });

  return NextResponse.json({
    success: true,
    data: { id, status: 'cancelled' },
  });
}

async function updateOrderStatus(supabase: Supabase, id: string, request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const result = OrderStatusUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: result.error.errors,
      },
      { status: 400 }
    );
  }

  const { status: newStatus, notes } = result.data;

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminRoleResult = await (supabase as any)
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single() as { data: { role: string } | null; error: Error | null };

  if (adminRoleResult.error || !adminRoleResult.data) {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Get order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderResult = await (supabase as any)
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .single() as { data: { id: string; status: string } | null; error: Error | null };

  if (orderResult.error || !orderResult.data) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }
  const order = orderResult.data as { id: string; status: string };

  // Update order status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateResult = await (supabase as any)
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id) as { error: Error | null };

  if (updateResult.error) {
    throw updateResult.error;
  }

  // Log status event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logResult = await (supabase as any)
    .from('order_status_events')
    .insert({
      order_id: id,
      new_status: newStatus,
      note: notes || null,
      actor_user_id: user.id,
    }) as { error: Error | null };

  if (logResult.error) {
    throw logResult.error;
  }

  logger.info('Order status updated', { orderId: id, status: newStatus, updatedBy: user.id });

  return NextResponse.json({
    success: true,
    data: { id, status: newStatus },
  });
}
