import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      paymentMethod,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get active cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (cartError || !cart) {
      return NextResponse.json(
        { error: 'No active cart' },
        { status: 400 }
      );
    }

    // Call RPC to create order from cart (atomic operation)
    const { data: order, error: orderError } = await supabase.rpc(
      'create_order_from_cart',
      {
        p_cart_id: cart.id,
        p_payment_method: paymentMethod || 'cod',
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_phone: phone,
        p_address: address,
        p_city: city,
        p_state: state,
        p_zip_code: zipCode,
      }
    );

    if (orderError) {
      logger.error('Order creation error:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create payment session (dummy payment gateway)
    const { data: session, error: sessionError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        amount: order.total,
        currency: 'INR',
        status: 'pending',
        payment_method: paymentMethod || 'cod',
      })
      .select()
      .single();

    if (sessionError) {
      logger.error('Payment session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        order,
        payment: session,
        redirect_url: paymentMethod === 'cod'
          ? `/order-confirmation/${order.id}`
          : `/dummy-payment?session_id=${session.id}&order_id=${order.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
