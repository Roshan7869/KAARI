import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const UpdateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  notes: z.string().max(1000).optional(),
  shipping_name: z.string().max(200).optional(),
  shipping_line1: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const { id } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await (supabase as any)
    .from('orders')
    .select(
      `*, profiles:user_id (id, full_name, email),
       order_items (id, product_id, variant_id, quantity, unit_price, line_total,
         products:product_id (id, title, slug, base_price,
           product_media (id, url, is_primary, sort_order)),
         product_variants:variant_id (id, sku, size, color, material, price))`
    )
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Admin order GET failed', { id, error: error.message });
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error('Admin order PATCH failed', { id, error: error.message });
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
