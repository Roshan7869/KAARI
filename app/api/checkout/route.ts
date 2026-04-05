import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { CheckoutSchema } from '@/lib/validations/checkout.schema';
import { applyRateLimit } from '@/lib/server-rate-limit';

/**
 * POST /api/checkout
 * Creates an order atomically via `create_order_from_checkout` RPC.
 * The RPC:
 *  1. Row-locks all product variants (deadlock-safe)
 *  2. Validates stock inside the transaction
 *  3. Inserts order + order_items + reduces stock atomically
 *  4. Marks cart converted with unique constraint (prevents double-checkout)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 20 checkout requests / 5 min per IP
  const rateLimitResponse = await applyRateLimit(request, 'checkout', false);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // ── 1. Auth ──────────────────────────────────────────────────────
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Validate request body ────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const result = CheckoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.errors },
        { status: 400 }
      );
    }

    const {
      cart_id,
      payment_method,
      shipping_name,
      shipping_line1,
      shipping_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
      shipping_method,
      shipping_amount,
      tax_amount,
      shipping_provider,
      shipping_provider_label,
    } = result.data;

    // ── 3. Create checkout_session record ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cart } = await (supabase as any)
      .from('carts')
      .select('id, user_id, status, currency')
      .eq('id', cart_id)
      .eq('user_id', user.id)
      .single();

    if (!cart) {
      return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 });
    }

    if (cart.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Cart is not active or already checked out' }, { status: 400 });
    }

    // Compute subtotal from cart items (used for checkout_session and totals response)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cartItems } = await (supabase as any)
      .from('cart_items')
      .select('unit_price, quantity, line_total')
      .eq('cart_id', cart_id);

    const subtotal: number = (cartItems || []).reduce(
      (sum: number, item: { line_total?: number; unit_price: number; quantity: number }) =>
        sum + (item.line_total ?? item.unit_price * item.quantity),
      0
    );

    if (subtotal <= 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const shipping = shipping_amount ?? 0;
    const tax = tax_amount ?? 0;
    const grandTotal = subtotal + shipping + tax;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: checkoutSession, error: checkoutError } = await (supabase as any)
      .from('checkout_sessions')
      .insert({
        cart_id,
        user_id: user.id,
        status: payment_method === 'cod' ? 'completed' : 'payment_pending',
        payment_method: payment_method ?? 'cod',
        shipping_name: shipping_name ?? null,
        shipping_line1: shipping_line1 ?? null,
        shipping_line2: shipping_line2 ?? null,
        city: shipping_city ?? null,
        state: shipping_state ?? null,
        postal_code: shipping_postal_code ?? null,
        country: shipping_country,
        shipping_method: shipping_method ?? 'standard',
        shipping_amount: shipping,
        tax_amount: tax,
        subtotal,
        total_amount: grandTotal,
      })
      .select('id')
      .single();

    if (checkoutError) {
      logger.error('Failed to create checkout session', { error: checkoutError.message });
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // ── 4. Atomic order creation via RPC ─────────────────────────────
    const shippingAddress = {
      name: shipping_name,
      line1: shipping_line1,
      line2: shipping_line2 ?? null,
      city: shipping_city,
      state: shipping_state,
      postal_code: shipping_postal_code,
      country: shipping_country,
    };

    const resolvedProvider = shipping_provider ?? 'INDIA_POST';
    const resolvedProviderLabel = shipping_provider_label ?? resolvedProvider;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
      'create_order_from_checkout',
      {
        p_cart_id: cart_id,
        p_user_id: user.id,
        p_payment_method: payment_method ?? 'cod',
        p_shipping_address: shippingAddress,
        p_tax_amount: tax,
        p_shipping_amount: shipping,
        p_shipping_provider: resolvedProvider,
        p_shipping_provider_label: resolvedProviderLabel,
        p_checkout_session_id: checkoutSession.id,
      }
    );

    if (rpcError) {
      logger.error('RPC create_order_from_checkout failed', { error: rpcError.message });
      return NextResponse.json(
        { success: false, error: 'Failed to create order. Please try again.' },
        { status: 500 }
      );
    }

    // RPC returns a table row — first element is our result
    const rpcRow = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

    if (!rpcRow?.success) {
      const errorMsg: string = rpcRow?.error_message || 'Order creation failed';
      logger.warn('Order creation RPC returned failure', { errorMsg });

      // Map known RPC errors to user-friendly messages
      if (errorMsg.includes('already been used') || errorMsg.includes('duplicate checkout')) {
        return NextResponse.json(
          { success: false, error: 'This order has already been placed. Check your orders page.' },
          { status: 409 }
        );
      }
      if (errorMsg.includes('Insufficient stock')) {
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }
      if (errorMsg.includes('no longer available')) {
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const orderId: string = rpcRow.order_id;
    const orderNumber: string = rpcRow.order_number;

    // ── 5. Create payments record (COD only; online handled by Cashfree route) ──
    if (payment_method === 'cod') {
      const { error: paymentError } = await admin
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'cod',
          amount: grandTotal,
          currency: cart.currency || 'INR',
          status: 'created',
        });

      if (paymentError) {
        // Non-fatal: log but don't fail the order
        logger.error('Failed to create COD payment record', { error: paymentError.message, orderId });
      }
    }

    logger.info('Order created successfully', { orderId, orderNumber, paymentMethod: payment_method });

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber,
        totals: {
          subtotal,
          shipping,
          tax,
          grandTotal,
        },
      },
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Checkout failed unexpectedly', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
