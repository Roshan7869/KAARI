import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const ManualOrderSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1).max(100),
    unit_price: z.number().min(0),
  })).min(1, 'At least one item required'),
  shipping_name: z.string().min(1).max(200),
  shipping_line1: z.string().min(1).max(300),
  shipping_line2: z.string().max(300).optional().default(''),
  shipping_city: z.string().min(1).max(100),
  shipping_state: z.string().min(1).max(100),
  shipping_postal_code: z.string().min(1).max(20),
  shipping_country: z.string().default('IN'),
  shipping_amount: z.number().min(0).default(0),
  payment_status: z.enum(['pending', 'paid', 'cod']).default('pending'),
  notes: z.string().max(1000).optional().default(''),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
  const offset = (page - 1) * limit;
  const status = searchParams.get('status');
  const search = searchParams.get('search') || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('orders')
    .select(
      `id, order_number, status, total_amount, shipping_amount, created_at, notes,
       shipping_name, shipping_line1, shipping_line2, city, state, postal_code, country,
       profiles:user_id (id, full_name, email),
       order_items (id, product_id, variant_id, quantity, unit_price, line_total,
         products:product_id (title, slug))`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
    const sanitized = search.replace(/[%_]/g, '\\$&');
    query = query.ilike('order_number', `%${sanitized}%`);
  }

  const { data: orders, count, error } = await query;
  if (error) {
    logger.error('Admin orders GET failed', error, { route: 'admin/orders' });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    orders: orders || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ManualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  // Calculate subtotal from items
  const subtotal = data.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalAmount = subtotal + data.shipping_amount;

  // Generate a simple order number
  const orderNumber = `ADM-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (supabase as any)
    .from('orders')
    .insert({
      user_id: data.user_id,
      status: data.status,
      total_amount: totalAmount,
      shipping_amount: data.shipping_amount,
      order_number: orderNumber,
      shipping_name: data.shipping_name,
      shipping_line1: data.shipping_line1,
      shipping_line2: data.shipping_line2 || null,
      city: data.shipping_city,
      state: data.shipping_state,
      postal_code: data.shipping_postal_code,
      country: data.shipping_country,
      notes: data.notes || null,
      payment_method: data.payment_status === 'cod' ? 'cod' : 'manual',
    })
    .select('id, order_number')
    .single();

  if (orderError) {
    logger.error('Admin manual order insert failed', orderError, { route: 'admin/orders POST' });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }

  // Insert order items
  const orderItems = data.items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.unit_price * item.quantity,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (supabase as any).from('order_items').insert(orderItems);
  if (itemsError) {
    // Rollback order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('orders').delete().eq('id', order.id);
    logger.error('Admin order items insert failed', itemsError, { route: 'admin/orders POST' });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: order.id, order_number: order.order_number }, { status: 201 });
}
