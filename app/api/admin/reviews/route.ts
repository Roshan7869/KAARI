import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

const ListReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  productId: z.string().optional(),
  customerName: z.string().optional(),
  ratingFilter: z.enum(['all', '1', '2', '3', '4', '5']).default('all'),
  statusFilter: z.enum(['all', 'approved', 'pending', 'rejected']).default('all'),
  visibilityFilter: z.enum(['all', 'visible', 'hidden']).default('all'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  searchQuery: z.string().optional(),
});

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = ListReviewsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const {
      page,
      pageSize,
      productId,
      customerName,
      ratingFilter,
      statusFilter,
      visibilityFilter,
      dateFrom,
      dateTo,
      searchQuery,
    } = parsed.data;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createAdminClient();
    let query = supabase
      .from('product_reviews')
      .select(`
        *,
        review_visibility (*),
        product:products(id, title),
        user:profiles(id, full_name, email)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (productId?.trim()) {
      query = query.eq('product_id', productId.trim());
    }
    if (ratingFilter !== 'all') {
      query = query.eq('rating', Number(ratingFilter));
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endOfDay.toISOString());
    }
    if (searchQuery?.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`title.ilike.${q},content.ilike.${q}`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      logger.error('Admin reviews list query failed', { error });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    let filtered = data ?? [];
    if (customerName?.trim()) {
      const q = customerName.trim().toLowerCase();
      filtered = filtered.filter((row) => {
        const name = String((row.user as { full_name?: string } | null)?.full_name ?? '').toLowerCase();
        const email = String((row.user as { email?: string } | null)?.email ?? '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter((row) => {
        const visible = (row.review_visibility as { is_visible?: boolean } | null)?.is_visible !== false;
        return visibilityFilter === 'visible' ? visible : !visible;
      });
    }

    return NextResponse.json({
      reviews: filtered,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        hasNextPage: (from + filtered.length) < (count ?? 0),
      },
    });
  } catch (error) {
    logger.error('Admin reviews GET failed', { error: toMessage(error) });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
