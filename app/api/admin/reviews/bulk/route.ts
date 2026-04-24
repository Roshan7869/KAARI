import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger-server';

const BulkActionSchema = z.object({
  action: z.enum(['bulk-toggle-visibility']),
  reviewIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const body = await request.json();
    const parsed = BulkActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { reviewIds } = parsed.data;

    const { data: rows, error: loadError } = await supabase
      .from('review_visibility')
      .select('review_id, is_visible')
      .in('review_id', reviewIds);

    if (loadError) {
      logger.error('Bulk visibility load failed', { loadError });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    const rowsById = new Map((rows ?? []).map((row) => [row.review_id, row]));
    const { data: reviews, error: reviewsError } = await supabase
      .from('product_reviews')
      .select('id, product_id')
      .in('id', reviewIds);

    if (reviewsError) {
      logger.error('Bulk reviews lookup failed', { reviewsError });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    const productByReviewId = new Map((reviews ?? []).map((row) => [row.id, row.product_id]));
    const upserts = reviewIds.map((reviewId) => {
      const current = rowsById.get(reviewId)?.is_visible;
      const nextVisible = current === false;
      const productId = productByReviewId.get(reviewId);
      if (!productId) {
        throw new Error(`Missing product_id for review ${reviewId}`);
      }
      return {
        review_id: reviewId,
        product_id: productId,
        is_visible: nextVisible,
      };
    });

    const { error: upsertError } = await supabase
      .from('review_visibility')
      .upsert(upserts, { onConflict: 'review_id' });

    if (upsertError) {
      logger.error('Bulk visibility upsert failed', { upsertError });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: reviewIds.length });
  } catch (error) {
    logger.error('Admin reviews bulk POST failed', { error });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
