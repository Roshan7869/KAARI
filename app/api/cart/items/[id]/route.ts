import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/verify-jwt';
import { logger } from '@/lib/logger';
import { CartItemUpdateSchema } from '@/lib/validations/cart.schema';
import type { Database } from '@/types/database';

/**
 * PUT /api/cart/items/[id]
 * Update cart item quantity
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const result = CartItemUpdateSchema.safeParse(body);
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

    const { quantity } = result.data;

    // Get cart item with product info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartItemResult = await (supabase as any)
      .from('cart_items')
      .select(`
        id,
        quantity,
        cart_id,
        product_id,
        variant_id,
        unit_price,
        products:product_id (allow_customization, base_price)
      `)
      .eq('id', id)
      .single() as { data: Database['public']['Tables']['cart_items']['Row'] & { products: { allow_customization: boolean; base_price: number } | null } | null; error: Error | null };

    if (cartItemResult.error || !cartItemResult.data) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      );
    }
    const cartItem = cartItemResult.data;

    // Get product/variant stock
    const product = cartItem.products as { allow_customization: boolean; base_price: number };
    let stock_qty = product.allow_customization ? 999 : 0;
    let unit_price = cartItem.unit_price;

    if (cartItem.variant_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantResult = await (supabase as any)
        .from('product_variants')
        .select('stock_qty, price')
        .eq('id', cartItem.variant_id)
        .single() as { data: { stock_qty: number; price: number | null } | null; error: Error | null };

      if (variantResult.error || !variantResult.data) {
        // Variant not found, use default values
      } else {
        stock_qty = variantResult.data.stock_qty;
        unit_price = variantResult.data.price || product.base_price;
      }
    }

    // Validate quantity
    if (quantity > stock_qty) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Update the cart item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedResult = await (supabase as any)
      .from('cart_items')
      .update({
        quantity,
        line_total: unit_price * quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single() as { data: Database['public']['Tables']['cart_items']['Row'] | null; error: Error | null };

    if (updatedResult.error) {
      throw updatedResult.error;
    }
    const updated = updatedResult.data as Database['public']['Tables']['cart_items']['Row'];

    logger.info('Cart item updated', { cartItemId: id, quantity });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to update cart item', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to update cart item',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart/items/[id]
 * Remove item from cart
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { searchParams, pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    logger.info('Cart item deleted', { cartItemId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to delete cart item', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to delete cart item',
      },
      { status: 500 }
    );
  }
}
