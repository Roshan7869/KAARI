import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quantity } = await request.json();

    if (quantity < 0 || quantity > 100) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Get cart item
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select('*, carts(user_id)')
      .eq('id', params.id)
      .single();

    if (itemError || cartItem.carts.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (quantity === 0) {
      // Delete item
      await supabase.from('cart_items').delete().eq('id', params.id);
      return NextResponse.json({ success: true });
    }

    // Update quantity
    const lineTotal = cartItem.unit_price * quantity;
    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity,
        line_total: lineTotal,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Cart item update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const { data: cartItem, error: checkError } = await supabase
      .from('cart_items')
      .select('*, carts(user_id)')
      .eq('id', params.id)
      .single();

    if (checkError || cartItem.carts.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: 'Delete failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Cart item delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
