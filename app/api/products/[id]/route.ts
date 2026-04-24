import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger-server';
import { ProductUpdateSchema, ProductParamsSchema } from '@/lib/validations/product.schema';

/**
 * PUT /api/products/[id]
 * Update product (admin only)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    // Verify product exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error: productError } = await (supabase as any)
      .from('products')
      .select('id')
      .eq('id', id)
      .single() as { data: { id: string } | null; error: Error | null };

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = ProductUpdateSchema.safeParse(body);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('products')
      .update(result.data)
      .eq('id', id)
      .select()
      .single() as { error: Error | null };

    if (error) {
      throw error;
    }

    logger.info('Product updated', { productId: id });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to update product', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to update product',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft delete product (admin only)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    // Verify product exists and soft delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id) as { error: Error | null };

    if (error) {
      throw error;
    }

    logger.info('Product soft deleted', { productId: id });

    return NextResponse.json({
      success: true,
      data: { message: 'Product deleted successfully' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to delete product', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to delete product',
      },
      { status: 500 }
    );
  }
}
