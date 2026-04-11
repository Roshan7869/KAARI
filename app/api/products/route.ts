import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger';
import { ProductListSchema, ProductCreateSchema } from '@/lib/validations/product.schema';

type SupabaseError = Error & { code?: string };
type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

type Product = {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  is_active: boolean;
  allow_customization: boolean;
  category: string;
  description: string;
  created_at: string;
  updated_at: string;
};

/**
 * GET /api/products
 * List products with filters and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const result = ProductListSchema.safeParse(Object.fromEntries(searchParams));

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

    const { category, search, price_min, price_max, is_active, page, limit, sort_by, sort_order } = result.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('products').select('*', { count: 'exact' });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (price_min !== undefined) {
      query = query.gte('base_price', price_min);
    }

    if (price_max !== undefined) {
      query = query.lte('base_price', price_max);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    // Sort
    const sortColumn = sort_by || 'created_at';
    const sortDirection = sort_order || 'desc';
    query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

    // Pagination
    const offset = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products, error, count } = await (query as any).range(offset, offset + limit - 1) as { data: unknown[] | null; error: Error | null; count?: number };

    if (error) {
      throw error;
    }

    logger.debug('Products list', { count, page, limit });

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get products', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const body = await request.json();

    const result = ProductCreateSchema.safeParse(body);

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

    const { slug, ...data } = result.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error } = await (supabase as any)
      .from('products')
      .insert({ ...data, slug: slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
      .select()
      .single() as SupabaseResponse<Product>;

    if (error) {
      throw error;
    }

    if (!product) {
      return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
    }

    logger.info('Product created', { productId: product.id, title: product.title });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create product', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create product',
      },
      { status: 500 }
    );
  }
}
