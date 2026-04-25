import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/csrf-server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeTextInput } from '@/lib/sanitization';
import { UpdateReviewSchema } from '@/lib/validations/review.schema';
import type { Database } from '@/types/database';

type Review = Database['public']['Tables']['product_reviews']['Row'];
type ReviewUpdate = Database['public']['Tables']['product_reviews']['Update'];
type SupabaseError = Error & { code?: string };
type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface UpdateReviewBody {
  rating?: number;
  title?: string;
  content?: string;
  status?: ReviewStatus;
}

/**
 * PATCH /api/reviews/[id]
 * Update own review (or admin can update any)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Review>>> {
  try {
    const { id } = await params;
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const isAdmin = (sessionClaims?.metadata as { role?: string } | undefined)?.role === 'admin';

    const csrfValid = await validateCsrfToken(request);
    if (!csrfValid) {
      return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
    }

    const supabase = await createClient();

    // Validate review ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID format' },
        { status: 400 }
      );
    }

    // Get the existing review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReview, error: fetchError } = await (supabase as any)
      .from('product_reviews')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin status
    if (existingReview.user_id !== userId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own reviews' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const rawBody = await request.json();
    const parsed = UpdateReviewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Build update object
    const updateData: Partial<ReviewUpdate> = {};

    if (body.rating !== undefined) {
      updateData.rating = body.rating;
    }

    if (body.title !== undefined) {
      updateData.title = sanitizeTextInput(body.title, 200);
    }

    if (body.content !== undefined) {
      updateData.content = sanitizeTextInput(body.content, 2000);
    }

    // Handle status update (admin only)
    if (body.status !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only admins can update review status' },
          { status: 403 }
        );
      }
      updateData.status = body.status;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedReview, error: updateError } = await (supabase as any)
      .from('product_reviews')
      .update(updateData as ReviewUpdate)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }
    if (!updatedReview) {
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedReview,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update review',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete own review or admin can delete any
 * Uses soft delete (sets deleted_at)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const isAdmin = (sessionClaims?.metadata as { role?: string } | undefined)?.role === 'admin';

    const csrfValid = await validateCsrfToken(request);
    if (!csrfValid) {
      return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
    }

    const supabase = await createClient();

    // Validate review ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID format' },
        { status: 400 }
      );
    }

    // Get the existing review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReview, error: fetchError } = await (supabase as any)
      .from('product_reviews')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check ownership or admin status
    if (existingReview.user_id !== userId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // Soft delete by setting deleted_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('product_reviews')
      .update({ deleted_at: new Date().toISOString() } as ReviewUpdate)
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete review',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews/[id]
 * Get a single review by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Review>>> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Validate review ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID format' },
        { status: 400 }
      );
    }

    // Get current user (optional — for ownership/admin visibility check)
    const { userId, sessionClaims } = await auth();
    const isAdmin = (sessionClaims?.metadata as { role?: string } | undefined)?.role === 'admin';

    // Get the review with user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: review, error: fetchError } = await (supabase as any)
      .from('product_reviews')
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user can view this review (must be approved, owned by user, or user is admin)
    if (review.status !== 'approved' && review.user_id !== userId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review',
      },
      { status: 500 }
    );
  }
}
