import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeTextInput } from '@/lib/sanitization';
import { CreateReviewSchema } from '@/lib/validations/review.schema';
import type { Database } from '@/types/database';

type Review = Database['public']['Tables']['product_reviews']['Row'];
type ReviewInsert = Database['public']['Tables']['product_reviews']['Insert'];
type SupabaseError = Error & { code?: string };
type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

interface ReviewWithUser extends Review {
  user: {
    id: string;
    full_name: string | null;
  } | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const VALID_SORT_OPTIONS = ['newest', 'highest', 'lowest', 'helpful'] as const;
type SortOption = typeof VALID_SORT_OPTIONS[number];

function isValidSort(value: string): value is SortOption {
  return VALID_SORT_OPTIONS.includes(value as SortOption);
}

/**
 * GET /api/reviews?product_id=xxx&page=1&limit=10&sort_by=newest
 * Get reviews for a product with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ReviewWithUser[]>>> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Validate product_id
    const productId = searchParams.get('product_id');
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product_id format' },
        { status: 400 }
      );
    }

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    // Parse sort
    const sortBy = searchParams.get('sort_by') || 'newest';
    if (!isValidSort(sortBy)) {
      return NextResponse.json(
        { success: false, error: `Invalid sort_by. Must be one of: ${VALID_SORT_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Build sort query
    let sortColumn: string;
    let sortAscending: boolean;
    switch (sortBy) {
      case 'newest':
        sortColumn = 'created_at';
        sortAscending = false;
        break;
      case 'highest':
        sortColumn = 'rating';
        sortAscending = false;
        break;
      case 'lowest':
        sortColumn = 'rating';
        sortAscending = true;
        break;
      case 'helpful':
        sortColumn = 'helpful_count';
        sortAscending = false;
        break;
      default:
        sortColumn = 'created_at';
        sortAscending = false;
    }

    // Get total count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'approved')
      .is('deleted_at', null) as { count?: number; error: SupabaseError | null };

    if (countError) {
      throw countError;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get reviews with user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviews, error: reviewsError } = await (supabase as any)
      .from('product_reviews')
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .eq('product_id', productId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order(sortColumn, { ascending: sortAscending })
      .range(offset, offset + limit - 1) as SupabaseResponse<Array<Review & { user: { id: string; full_name: string | null } | null }>>;

    if (reviewsError) {
      throw reviewsError;
    }

    return NextResponse.json({
      success: true,
      data: reviews as ReviewWithUser[],
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Create a new review
 * Requires authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Review>>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const validationResult = CreateReviewSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Sanitize text fields
    const sanitizedTitle = sanitizeTextInput(validatedData.title || '', 100);
    const sanitizedContent = sanitizeTextInput(validatedData.content || '', 2000);

    if (sanitizedTitle.length < 3) {
      return NextResponse.json(
        { success: false, error: 'title must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (sanitizedContent.length < 10) {
      return NextResponse.json(
        { success: false, error: 'content must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate product_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validatedData.product_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product_id format' },
        { status: 400 }
      );
    }

    // Validate order_id format if provided
    let orderId: string | null = null;
    if (body.order_id) {
      if (!uuidRegex.test(body.order_id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid order_id format' },
          { status: 400 }
        );
      }
      orderId = body.order_id;

      // Verify the order belongs to the user and contains the product
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderCheck, error: orderError } = await (supabase as any)
        .from('orders')
        .select('id, status')
        .eq('id', orderId!)
        .eq('user_id', user.id)
        .single() as { data: { id: string; status: string } | null; error: Error | null };

      if (orderError || !orderCheck) {
        return NextResponse.json(
          { success: false, error: 'Order not found or does not belong to you' },
          { status: 403 }
        );
      }

      // Verify order contains the product
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderItemCheck, error: orderItemError } = await (supabase as any)
        .from('order_items')
        .select('id')
        .eq('order_id', orderId!)
        .eq('product_id', body.product_id)
        .single() as { data: { id: string } | null; error: Error | null };

      if (orderItemError || !orderItemCheck) {
        return NextResponse.json(
          { success: false, error: 'Product not found in the specified order' },
          { status: 400 }
        );
      }

      // Check if user already reviewed this product for this order
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingReview, error: _existingError } = await (supabase as any)
        .from('product_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', body.product_id)
        .eq('order_id', orderId!)
        .is('deleted_at', null)
        .single() as { data: { id: string } | null; error: Error | null };

      if (existingReview) {
        return NextResponse.json(
          { success: false, error: 'You have already reviewed this product for this order' },
          { status: 409 }
        );
      }
    } else {
      // Check if user already reviewed this product (without order)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingReview, error: _existingError } = await (supabase as any)
        .from('product_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', body.product_id)
        .is('order_id', null)
        .is('deleted_at', null)
        .single() as { data: { id: string } | null; error: Error | null };

      if (existingReview) {
        return NextResponse.json(
          { success: false, error: 'You have already reviewed this product' },
          { status: 409 }
        );
      }
    }

    // Insert review - is_verified_purchase is set automatically by trigger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: review, error: insertError } = await (supabase as any)
      .from('product_reviews')
      .insert({
        product_id: body.product_id,
        user_id: user.id,
        order_id: orderId,
        rating: body.rating,
        title: sanitizedTitle,
        content: sanitizedContent,
        status: 'pending',
      } as ReviewInsert)
      .select()
      .single() as SupabaseResponse<Review>;

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'You have already reviewed this product' },
          { status: 409 }
        );
      }
      throw insertError;
    }
    if (!review) {
      return NextResponse.json({ success: false, error: 'Failed to create review' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: review },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create review',
      },
      { status: 500 }
    );
  }
}
