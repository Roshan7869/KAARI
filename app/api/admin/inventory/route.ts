import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const lowStock = searchParams.get('low_stock') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('product_variants')
    .select(
      `id, sku, size, color, material, price, stock_qty, is_active,
       products:product_id (id, title, slug, category, is_active)`
    )
    .order('stock_qty', { ascending: true });

  if (lowStock) query = query.lt('stock_qty', 5);
  if (search) {
    const sanitized = search.replace(/[%_]/g, '\\$&');
    query = query.ilike('sku', `%${sanitized}%`);
  }

  const { data, error } = await query;
  if (error) {
    logger.error('Admin inventory query failed', error, { route: 'admin/inventory' });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ variants: data || [] });
}
