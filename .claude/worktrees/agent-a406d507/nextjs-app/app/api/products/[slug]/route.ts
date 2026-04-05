import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (
          id,
          sku,
          price,
          stock_qty,
          is_default
        ),
        product_media (
          id,
          url,
          alt_text,
          sort_order
        )
      `)
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      logger.error('Product not found:', params.slug);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.error('Product detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();
    const user = await supabase.auth.getUser();

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
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { data, error } = await supabase
      .from('products')
      .update(body)
      .eq('slug', params.slug)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createClient();
    const user = await supabase.auth.getUser();

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
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('slug', params.slug);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Product delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
