import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sanitizeSearchQuery } from '@/lib/sanitization';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        product_variants (
          id,
          sku,
          stock_qty,
          price,
          is_default
        ),
        product_media (
          id,
          url,
          alt_text,
          sort_order
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      const sanitized = sanitizeSearchQuery(search);
      query = query.or(
        `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`
      );
    }

    if (category) {
      query = query.eq('category', category);
    }

    // Get total count
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get paginated results
    const { data: products, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Products query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await supabase.auth.getUser();

    // Check admin role
    if (!user.data.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: hasAdmin } = await supabase.rpc('has_role', {
      _role: 'admin',
      _user_id: user.data.user.id,
    });

    if (!hasAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { data, error } = await supabase
      .from('products')
      .insert([body])
      .select()
      .single();

    if (error) {
      logger.error('Product creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error('Products POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
