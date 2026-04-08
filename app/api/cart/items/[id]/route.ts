import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { CartItemUpdateSchema } from '@/lib/validations/cart.schema';
import type { Database } from '@/types/database';

/**
 * PUT /api/cart/items/[id]
 * Update cart item quantity
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID required' }, { status: 400 });
    }

    const body = await request.json();
    const result = CartItemUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      );
    }

    const { quantity } = result.data;
    const supabase = createAdminClient();

    // Get cart item and verify it belongs to the user
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
        products:product_id (allow_customization, base_price),
        carts!inner (user_id)
      `)
      .eq('id', id)
      .single() as { data: (Database['public']['Tables']['cart_items']['Row'] & { products: { allow_customization: boolean; base_price: number } | null; carts: { user_id: string } }) | null; error: Error | null };

    if (cartItemResult.error || !cartItemResult.data) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
    }
    const cartItem = cartItemResult.data;

    // Verify ownership
    if (cartItem.carts.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

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

      if (variantResult.data) {
        stock_qty = variantResult.data.stock_qty;
        unit_price = variantResult.data.price || product.base_price;
      }
    }

    if (quantity > stock_qty) {
      return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedResult = await (supabase as any)
      .from('cart_items')
      .update({ quantity, line_total: unit_price * quantity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single() as { data: Database['public']['Tables']['cart_items']['Row'] | null; error: Error | null };

    if (updatedResult.error) throw updatedResult.error;

    logger.info('Cart item updated', { cartItemId: id, quantity });

    return NextResponse.json({ success: true, data: updatedResult.data });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to update cart item', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart/items/[id]
 * Remove item from cart
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify ownership before deleting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerCheck = await (supabase as any)
      .from('cart_items')
      .select('id, carts!inner(user_id)')
      .eq('id', id)
      .single() as { data: { id: string; carts: { user_id: string } } | null; error: Error | null };

    if (ownerCheck.error || !ownerCheck.data) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 });
    }

    if (ownerCheck.data.carts.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('cart_items').delete().eq('id', id);
    if (error) throw error;

    logger.info('Cart item deleted', { cartItemId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to delete cart item', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete cart item' },
      { status: 500 }
    );
  }
}
