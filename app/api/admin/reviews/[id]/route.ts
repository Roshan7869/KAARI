import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger-server';

const UpdateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending']).optional(),
});

const UpdateVisibilitySchema = z.object({
  is_visible: z.boolean().optional(),
  display_priority: z.number().int().min(0).max(100).optional(),
  placement_type: z.enum(['featured', 'normal', 'hidden']).optional(),
  admin_notes: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/reviews/[id]
 * Update review status or visibility. Admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;
    const { id } = await params;

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;

    // Handle review status update
    if (body.status !== undefined) {
      const validated = UpdateReviewSchema.parse({ status: body.status });
      const { data, error } = await supabase
        .from('product_reviews')
        .update({ status: validated.status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update review status', { error, reviewId: id });
        return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ review: data });
    }

    // Handle visibility update
    const validated = UpdateVisibilitySchema.parse(body);

    // Check if visibility record exists
    const { data: existingVisibility } = await supabase
      .from('review_visibility')
      .select('id')
      .eq('review_id', id)
      .maybeSingle();

    let error;
    if (existingVisibility) {
      ({ error } = await supabase
        .from('review_visibility')
        .update(validated)
        .eq('review_id', id));
    } else {
      // Need product_id for insert — fetch from review
      const { data: review } = await supabase
        .from('product_reviews')
        .select('product_id')
        .eq('id', id)
        .single();

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }

      ({ error } = await supabase
        .from('review_visibility')
        .insert({ review_id: id, product_id: review.product_id, ...validated }));
    }

    if (error) {
      logger.error('Failed to update review visibility', { error, reviewId: id });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.message.includes('Unauthorized') ? 401 : 403 });
    }
    logger.error('Admin review PATCH failed', { error: error.message });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 * Soft-delete a review. Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;
    const { id } = await params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const { error } = await supabase
      .from('product_reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete review', { error, reviewId: id });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.message.includes('Unauthorized') ? 401 : 403 });
    }
    logger.error('Admin review DELETE failed', { error: error.message });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}