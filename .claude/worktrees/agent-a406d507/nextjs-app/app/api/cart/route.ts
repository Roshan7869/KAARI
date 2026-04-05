import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active cart for user
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select(`
        *,
        cart_items (
          *,
          cart_item_customizations (
            *,
            customization_uploads (*)
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cartError && cartError.code !== 'PGRST116') {
      logger.error('Cart fetch error:', cartError);
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cart: cart || {
        id: null,
        user_id: user.id,
        status: 'active',
        currency: 'INR',
        items: [],
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Cart GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      product_id,
      variant_id,
      quantity,
      unit_price,
      customization,
    } = body;

    // Validate quantity
    if (quantity < 1 || quantity > 100) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Get or create active cart
    let { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (cartError) {
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({
          user_id: user.id,
          status: 'active',
          currency: 'INR',
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    // Check stock
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select('stock_qty, id')
      .eq('product_id', product_id)
      .eq('id', variant_id || '')
      .maybeSingle();

    if (!variant || variant.stock_qty < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Add item to cart
    const lineTotal = unit_price * quantity;
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id,
        variant_id: variant.id,
        quantity,
        unit_price,
        line_total: lineTotal,
        item_type: customization ? 'customized' : 'standard',
      })
      .select()
      .single();

    if (itemError) {
      return NextResponse.json(
        { error: 'Failed to add item' },
        { status: 500 }
      );
    }

    // Add customization if present
    if (customization) {
      await supabase
        .from('cart_item_customizations')
        .insert({
          cart_item_id: cartItem.id,
          customization_message: customization.message,
          preferred_size: customization.preferredSize,
          preferred_color: customization.preferredColor,
          preferred_material: customization.preferredMaterial,
          delivery_deadline: customization.deliveryDeadline,
          budget_min: customization.budgetMin,
          budget_max: customization.budgetMax,
          quote_status: customization.quoteStatus || 'pending',
          requires_manual_review: true,
        });
    }

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    logger.error('Cart POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
