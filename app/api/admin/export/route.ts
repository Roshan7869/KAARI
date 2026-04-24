import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const lines = rows.map(row => headers.map(h => escapeCSV(row[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'orders';

  const supabase = createAdminClient();
  let csv = '';
  let filename = 'export.csv';

  if (type === 'orders') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('orders')
      .select(`id, order_number, status, total_amount, shipping_amount, created_at,
               shipping_name, city, state, postal_code, country, payment_method, notes,
               profiles:user_id (full_name, email)`)
      .order('created_at', { ascending: false })
      .limit(5000);

    const rows: Record<string, unknown>[] = (data || []).map((o: Record<string, unknown>) => ({
      order_id: o.id,
      order_number: o.order_number,
      status: o.status,
      customer_name: (o.profiles as { full_name?: string })?.full_name || '',
      customer_email: (o.profiles as { email?: string })?.email || '',
      total_amount: o.total_amount,
      shipping_amount: o.shipping_amount,
      payment_method: o.payment_method,
      shipping_name: o.shipping_name,
      city: o.city,
      state: o.state,
      postal_code: o.postal_code,
      country: o.country,
      notes: o.notes,
      created_at: o.created_at,
    }));

    csv = toCSV(rows, ['order_id', 'order_number', 'status', 'customer_name', 'customer_email',
      'total_amount', 'shipping_amount', 'payment_method', 'shipping_name', 'city', 'state',
      'postal_code', 'country', 'notes', 'created_at']);
    filename = `orders-${new Date().toISOString().split('T')[0]}.csv`;

  } else if (type === 'products') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('products')
      .select(`id, title, slug, category, base_price, product_type, is_active, created_at,
               product_variants (id, sku, size, color, material, price, stock_qty)`)
      .order('created_at', { ascending: false })
      .limit(5000);

    const rows: Record<string, unknown>[] = [];
    for (const p of (data || [])) {
      const variants = (p.product_variants as Array<Record<string, unknown>>) || [];
      if (variants.length === 0) {
        rows.push({ product_id: p.id, title: p.title, slug: p.slug, category: p.category,
          base_price: p.base_price, product_type: p.product_type, is_active: p.is_active,
          variant_sku: '', size: '', color: '', material: '', variant_price: '', stock_qty: '', created_at: p.created_at });
      } else {
        for (const v of variants) {
          rows.push({ product_id: p.id, title: p.title, slug: p.slug, category: p.category,
            base_price: p.base_price, product_type: p.product_type, is_active: p.is_active,
            variant_sku: v.sku, size: v.size, color: v.color, material: v.material,
            variant_price: v.price, stock_qty: v.stock_qty, created_at: p.created_at });
        }
      }
    }

    csv = toCSV(rows, ['product_id', 'title', 'slug', 'category', 'base_price', 'product_type',
      'is_active', 'variant_sku', 'size', 'color', 'material', 'variant_price', 'stock_qty', 'created_at']);
    filename = `products-${new Date().toISOString().split('T')[0]}.csv`;

  } else if (type === 'customers') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select(`id, full_name, email, phone, created_at`)
      .order('created_at', { ascending: false })
      .limit(5000);

    // Fetch order counts per customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderCounts } = await (supabase as any)
      .from('orders')
      .select('user_id, total_amount');

    const countMap: Record<string, { count: number; total: number }> = {};
    for (const o of (orderCounts || [])) {
      if (!countMap[o.user_id]) countMap[o.user_id] = { count: 0, total: 0 };
      countMap[o.user_id].count += 1;
      countMap[o.user_id].total += o.total_amount || 0;
    }

    const rows: Record<string, unknown>[] = (data || []).map((p: Record<string, unknown>) => ({
      customer_id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      total_orders: countMap[p.id as string]?.count || 0,
      total_spent: countMap[p.id as string]?.total || 0,
      created_at: p.created_at,
    }));

    csv = toCSV(rows, ['customer_id', 'full_name', 'email', 'phone', 'total_orders', 'total_spent', 'created_at']);
    filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;

  } else {
    return NextResponse.json({ error: 'Invalid export type. Use: orders, products, customers' }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
