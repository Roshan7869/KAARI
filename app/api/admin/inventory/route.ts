import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
  if (search) query = query.ilike('sku', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ variants: data || [] });
}
