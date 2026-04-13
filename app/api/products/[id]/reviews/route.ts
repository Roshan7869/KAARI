import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { ProductParamsSchema } from '@/lib/validations/product.schema';

type SupabaseError = Error & { code?: string };
type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

/**
 * GET /api/products/[id]/reviews
 * Get reviews for a product
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    const result = ProductParamsSchema.safeParse({ id });
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

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, title, is_active')
      .eq('id', result.data.id)
      .single();

    if (productError && productError.code !== 'PGRST116') {
      throw productError;
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get reviews with user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviews, error: reviewsError, count } = await (supabase as any)
      .from('product_reviews')
      .select(`
        id,
        rating,
        title,
        content,
        is_verified_purchase,
        helpful_count,
        created_at,
        user:user_id (id, full_name, avatar_url)
      `)
      .eq('product_id', result.data.id)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as SupabaseResponse<Array<{ id: string; rating: number; title: string | null; content: string | null; is_verified_purchase: boolean; helpful_count: number; created_at: string; user: { id: string; full_name: string | null; avatar_url: string | null } }>> & { count?: number };

    if (reviewsError) {
      throw reviewsError;
    }

    const reviewsData = (reviews || []) as Array<{ id: string; rating: number; title: string | null; content: string | null; is_verified_purchase: boolean; helpful_count: number; created_at: string; user: { id: string; full_name: string | null; avatar_url: string | null } }>;

    // Calculate average rating
    const avgRating = reviewsData.length
      ? reviewsData.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewsData.length
      : null;

    logger.debug('Product reviews', { productId: id, count: reviewsData.length });

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviewsData,
        meta: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
        summary: {
          avg_rating: avgRating,
          rating_distribution: calculateRatingDistribution(reviewsData),
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get product reviews', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch product reviews',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/reviews
 * Create a review for a product
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    const result = ProductParamsSchema.safeParse({ id });
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

    // Check if product exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error: productError } = await (supabase as any)
      .from('products')
      .select('id, title, is_active')
      .eq('id', result.data.id)
      .single() as { data: { id: string; title: string; is_active: boolean } | null; error: Error | null };

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.is_active) {
      return NextResponse.json(
        { success: false, error: 'Product is not active' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rating, title, content } = body;
    // NOTE: is_verified_purchase is NOT accepted from the client — always computed server-side

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user already reviewed this product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReview } = await (supabase as any)
      .from('product_reviews')
      .select('id')
      .eq('product_id', result.data.id)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle() as { data: { id: string } | null; error: Error | null };

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 409 }
      );
    }

    // Check if user purchased this product — compute server-side, never trust client
    // Join orders table to verify the order was completed (not just placed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderItem } = await (supabase as any)
      .from('order_items')
      .select('id, orders!inner(status)')
      .eq('product_id', result.data.id)
      .eq('user_id', userId)
      .in('orders.status', ['delivered', 'paid', 'shipped'])
      .maybeSingle() as { data: { id: string } | null; error: Error | null };

    const isVerifiedPurchase = !!orderItem;

    // Create review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: review, error: reviewError } = await (supabase as any)
      .from('product_reviews')
      .insert({
        product_id: result.data.id,
        user_id: userId,
        rating,
        title: title || null,
        content: content || null,
        is_verified_purchase: isVerifiedPurchase,
        status: isVerifiedPurchase ? 'approved' : 'pending',
      })
      .select()
      .single() as SupabaseResponse<{ id: string }>;

    if (reviewError) {
      throw reviewError;
    }

    if (!review) {
      return NextResponse.json({ success: false, error: 'Failed to create review' }, { status: 500 });
    }

    logger.info('Review created', { reviewId: review.id, productId: result.data.id });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create review', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create review',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Calculate rating distribution
 */
function calculateRatingDistribution(reviews: Array<{ rating: number }>) {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const review of reviews) {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  }

  return distribution;
}
