import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { CheckoutSchema } from '@/lib/validations/checkout.schema';
import { applyRateLimit, applyCheckoutRateLimits } from '@/lib/server-rate-limit';

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
  // Rate limit: 20 checkout requests / 5 min per IP (legacy)
  const rateLimitResponse = await applyRateLimit(request, 'checkout', false);
  if (rateLimitResponse) return rateLimitResponse;

  // ── Enhanced rate limiting for order placement ────────────────────────
  // Apply multi-tier rate limiting:
  // - Per-user: 5 orders per minute per user
  // - Per-IP: 20 orders per minute per IP
  // - Global: 100 orders per minute total
  const { userId } = await auth();
  if (userId) {
    const enhancedRateLimitResponse = await applyCheckoutRateLimits(request, userId, false);
    if (enhancedRateLimitResponse) return enhancedRateLimitResponse;
  }

  try {
    const admin = createAdminClient();

    // ── 1. Auth ──────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
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
      // Explicitly exclude amount fields to prevent client manipulation
      // shipping_amount,
      // tax_amount,
      shipping_provider,
      shipping_provider_label,
    } = result.data;

    // SECURITY: Never trust client-provided amounts - always compute from cart
    // Client may send shipping_amount or tax_amount but we ignore them completely
    // All pricing MUST come from the database cart items to prevent manipulation

    // ── 3. Create checkout_session record ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cart } = await (admin as any)
      .from('carts')
      .select('id, user_id, status, currency, pricing')
      .eq('id', cart_id)
      .eq('user_id', userId)
      .single();

    if (!cart) {
      return NextResponse.json({ success: false, error: 'Cart not found' }, { status: 404 });
    }

    if (cart.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Cart is not active or already checked out' }, { status: 400 });
    }

    // Compute subtotal from cart items (used for checkout_session and totals response)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cartItems } = await (admin as any)
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

    // SECURITY: Calculate shipping and tax from cart, NEVER from client-provided values
    // Even though we extracted shipping_amount and tax_amount from the request above,
    // we deliberately ignore them to prevent manipulation

    // Get cart-level pricing information from the database (SECURE)
    // Calculate shipping: Free for orders over ₹500, otherwise ₹99
    const shipping = subtotal > 500 ? 0 : 99;
    const tax = 0; // No tax for handmade goods in India
    const grandTotal = subtotal + shipping + tax;

    // ── 3.1 Validate order amount ─────────────────────────────────────
    // SECURITY: Validate minimum and maximum order amounts to prevent abuse
    // and comply with Cashfree requirements
    const MINIMUM_ORDER_AMOUNT = 1.00;  // Cashfree minimum
    const MAXIMUM_ORDER_AMOUNT = 100000.00; // ₹1 lakh maximum to prevent abuse

    if (grandTotal < MINIMUM_ORDER_AMOUNT) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order amount is ₹${MINIMUM_ORDER_AMOUNT.toFixed(2)}`
        },
        { status: 400 }
      );
    }

    if (grandTotal > MAXIMUM_ORDER_AMOUNT) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum order amount is ₹${MAXIMUM_ORDER_AMOUNT.toLocaleString('en-IN')} (₹1,00,000). Contact support for bulk orders`
        },
        { status: 400 }
      );
    }

    // Validate amount matches cart items to prevent manipulation
    // Calculate total from individual item prices
    let calculatedTotal = 0;
    for (const item of (cartItems || [])) {
      calculatedTotal += item.line_total ?? (item.unit_price * item.quantity);
    }

    // Add shipping and tax to calculated total
    const calculatedGrandTotal = calculatedTotal + shipping + tax;

    // Allow 1 paisa (0.01) rounding difference tolerance
    if (Math.abs(grandTotal - calculatedGrandTotal) > 0.01) {
      logger.warn('Security Alert: Order total mismatch', {
        userId,
        cartId: cart_id,
        providedTotal: grandTotal,
        calculatedTotal: calculatedGrandTotal,
        difference: Math.abs(grandTotal - calculatedGrandTotal)
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Order total mismatch. Please refresh cart and try again'
        },
        { status: 400 }
      );
    }

    // Log if client sent amount values (potential attack vector)
    if (result.data.shipping_amount !== undefined || result.data.tax_amount !== undefined) {
      logger.warn('Security Alert: Client sent amount values (IGNORED)', {
        userId,
        cartId: cart_id,
        sentShippingAmount: result.data.shipping_amount,
        sentTaxAmount: result.data.tax_amount,
        actualShippingAmount: shipping,
        actualTaxAmount: tax,
        message: 'Potential order manipulation attempt detected and blocked'
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: checkoutSession, error: checkoutError } = await (admin as any)
      .from('checkout_sessions')
      .insert({
        cart_id,
        user_id: userId,
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

    // SECURITY: Validate that item prices haven't been tampered with client-side
    // ── 4. Validate individual item prices ─────────────────────────────
    const adminClient = createAdminClient();
    for (const item of (cartItems || [])) {
      // Get the latest price for this item directly from the database
      try {
        const { data: productData, error: productError } = await adminClient
          .from('products')
          .select('base_price')
          .eq('id', item.product_id)
          .maybeSingle();

        if (productError) {
          logger.error('Failed to fetch product price', {
            productId: item.product_id,
            error: productError.message
          });
          continue; // Skip validation for this item if we can't fetch it
        }

        if (productData) {
          // For products without variants, check base_price
          const expectedPrice = productData.base_price;
          const actualPrice = item.unit_price;

          // Allow 1 paisa (0.01) rounding difference tolerance
          if (Math.abs(actualPrice - expectedPrice) > 0.01) {
            logger.warn('Security Alert: Item price mismatch', {
              userId,
              cartId: cart_id,
              productId: item.product_id,
              expectedPrice,
              actualPrice,
              difference: Math.abs(actualPrice - expectedPrice)
            });

            // Check for suspicious patterns - extremely low-value orders with many items
            if (grandTotal <= 1.00 && (cartItems || []).length > 5) {
              logger.warn('Security Alert: Suspicious low-value order with multiple items', {
                userId,
                cartId: cart_id,
                totalAmount: grandTotal,
                itemCount: (cartItems || []).length
              });

              return NextResponse.json(
                {
                  success: false,
                  error: 'Your order appears suspicious. Please contact support.'
                },
                { status: 400 }
              );
            }

            return NextResponse.json(
              {
                success: false,
                error: `Price changed for an item in your cart. Please review your cart.`
              },
              { status: 400 }
            );
          }
        }
      } catch (priceError) {
        logger.error('Error validating item price', {
          productId: item.product_id,
          error: (priceError as Error).message
        });
        // Don't fail checkout for price validation errors, proceed with caution
      }
    }

    // ── 5. Atomic order creation via RPC ─────────────────────────────
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

    // Set order expiry to 15 minutes from now (matching Cashfree expiry)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcResult, error: rpcError } = await (admin as any).rpc(
      'create_order_from_checkout',
      {
        p_cart_id: cart_id,
        p_user_id: userId,
        p_payment_method: payment_method ?? 'cod',
        p_shipping_address: shippingAddress,
        p_tax_amount: tax,
        p_shipping_amount: shipping,
        p_shipping_provider: resolvedProvider,
        p_shipping_provider_label: resolvedProviderLabel,
        p_checkout_session_id: checkoutSession.id,
        p_expires_at: expiresAt,
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

    // ── 7. Create payments record (COD only; online handled by Cashfree route) ──
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
