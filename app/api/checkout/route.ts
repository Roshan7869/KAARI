import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/auth-client';
import { requireSupabaseUserId } from '@/lib/clerk-to-supabase';
import { logger } from '@/lib/logger-server';
import { CheckoutSchema } from '@/lib/validations/checkout.schema';
import { applyRateLimit, applyCheckoutRateLimits } from '@/lib/server-rate-limit';
import { validateCsrfToken } from '@/lib/csrf-server';
import { calculateShipping } from '@/lib/shipping';

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
  // Rate limit: 20 checkout requests / 5 min per IP (fail-open for checkout availability)
  const rateLimitResponse = await applyRateLimit(request, 'checkout', false);
  if (rateLimitResponse) return rateLimitResponse;

  // ── Enhanced rate limiting for order placement ────────────────────────
  // Apply multi-tier rate limiting:
  // - Per-user: 5 orders per minute per user
  // - Per-IP: 20 orders per minute per IP
  // - Global: 100 orders per minute total
  const { userId: clerkUserId } = await auth();
  if (clerkUserId) {
    const enhancedRateLimitResponse = await applyCheckoutRateLimits(request, clerkUserId, false);
    if (enhancedRateLimitResponse) return enhancedRateLimitResponse;
  }

  try {
    // ── 0. CSRF validation (server-side) ───────────────────────────────
    const csrfValid = await validateCsrfToken(request);
    if (!csrfValid) {
      return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
    }

    const admin = await createUserClient();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // ── 1. Auth ──────────────────────────────────────────────────────
    let userId: string | null = null;
    let guestEmail: string | null = null;
    let guestPhone: string | null = null;
    let guestName: string | null = null;

    if (clerkUserId) {
      // Authenticated user: resolve Clerk ID to Supabase UUID
      userId = await requireSupabaseUserId(clerkUserId);

      // ── 1.1 Email verification check ──────────────────────────────────
      const { sessionClaims } = await auth();
      if (!sessionClaims?.email_verified) {
        return NextResponse.json(
          { success: false, error: 'Please verify your email before checkout.' },
          { status: 403 }
        );
      }
    } else {
      // Guest checkout: require contact info
      // We'll read guest info from the parsed body below
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
      email,
      phone,
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
      coupon_code,
    } = result.data;

    // Guest checkout validation
    if (!clerkUserId) {
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email is required for guest checkout' },
          { status: 400 }
        );
      }
      guestEmail = email ?? null;
      guestPhone = phone ?? null;
      guestName = shipping_name ?? null;
    }

    // SECURITY: Never trust client-provided amounts - always compute from cart
    // Client may send shipping_amount or tax_amount but we ignore them completely
    // All pricing MUST come from the database cart items to prevent manipulation

    // ── 3. Cart lookup ──────────────────────────────────────────────
    // Guest users send cart items directly; authenticated users use the cart record
    if (!clerkUserId && cart_id === 'guest') {
      // Guest checkout: create a temporary cart and items for the guest
      // Use a synthetic user_id so the RPC can work
      const guestUserId = crypto.randomUUID();
      const { data: guestCart, error: guestCartError } = await admin
        .from('carts')
        .insert({
          user_id: guestUserId,
          status: 'active',
          currency: 'INR',
        })
        .select('id, user_id')
        .single();

      if (guestCartError || !guestCart) {
        logger.error('Failed to create guest cart', { error: guestCartError?.message });
        return NextResponse.json(
          { success: false, error: 'Failed to initialize guest checkout' },
          { status: 500 }
        );
      }

      // Insert guest cart items from the request body (items field)
      const guestItems = (result.data as Record<string, unknown> & { items?: Array<{ product_id: string; variant_id?: string; quantity: number; unit_price: number; item_type?: string }> }).items;
      if (!guestItems || guestItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cart is empty' },
          { status: 400 }
        );
      }

      const cartItemsInsert = guestItems.map((item) => ({
        cart_id: guestCart.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.unit_price * item.quantity,
        item_type: item.item_type || 'standard',
      }));

      const { error: insertItemsError } = await admin
        .from('cart_items')
        .insert(cartItemsInsert);

      if (insertItemsError) {
        logger.error('Failed to insert guest cart items', { error: insertItemsError.message });
        return NextResponse.json(
          { success: false, error: 'Failed to create guest cart items' },
          { status: 500 }
        );
      }

      // Set variables for the rest of the checkout flow
      userId = guestCart.user_id;
      // Continue with the guest cart as if it were a normal cart
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User identification required' }, { status: 400 });
    }

    const { data: cart } = await admin
      .from('carts')
      .select('id, user_id, status, currency')
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
    const { data: cartItems } = await admin
      .from('cart_items')
      .select('unit_price, quantity, line_total, product_id, variant_id')
      .eq('cart_id', cart_id);

    const subtotal: number = (cartItems || []).reduce(
      (sum: number, item: { line_total?: number; unit_price: number; quantity: number }) =>
        sum + (item.line_total ?? item.unit_price * item.quantity),
      0
    );

    if (subtotal <= 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    // ── FIX-C5: Server-side coupon validation ───────────────────────────
    // SECURITY: Never trust client-provided discount amounts.
    // If a coupon_code is provided, revalidate on the server and apply discount.
    let couponDiscount = 0;
    let validatedCouponId: string | null = null;
    let couponUsageCountAtValidation: number | null = null;
    let couponUsageLimit: number | null = null;

    if (coupon_code) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: coupon, error: couponError } = await (admin as any)
        .from('coupons')
        .select('id, code, type, value, min_order_amount, max_discount_amount, usage_limit, usage_count, valid_from, valid_until, is_active')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (couponError || !coupon) {
        return NextResponse.json({ success: false, error: 'Invalid or expired coupon code' }, { status: 400 });
      }

      const now = new Date();
      if (new Date(coupon.valid_from) > now) {
        return NextResponse.json({ success: false, error: 'Coupon is not yet active' }, { status: 400 });
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return NextResponse.json({ success: false, error: 'Coupon has expired' }, { status: 400 });
      }
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        return NextResponse.json({ success: false, error: 'Coupon has been fully redeemed' }, { status: 400 });
      }
      if (subtotal < coupon.min_order_amount) {
        return NextResponse.json({ success: false, error: `Minimum order of ₹${coupon.min_order_amount.toLocaleString('en-IN')} required for this coupon` }, { status: 400 });
      }

      // Calculate discount server-side
      if (coupon.type === 'percentage') {
        couponDiscount = (subtotal * coupon.value) / 100;
        if (coupon.max_discount_amount !== null) {
          couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
        }
      } else {
        couponDiscount = Math.min(coupon.value, subtotal);
      }
      couponDiscount = Math.round(couponDiscount * 100) / 100;
      validatedCouponId = coupon.id;
      couponUsageCountAtValidation = coupon.usage_count ?? 0;
      couponUsageLimit = coupon.usage_limit ?? null;
    }

    // SECURITY: Calculate shipping and tax from cart, NEVER from client-provided values
    // Even though we extracted shipping_amount and tax_amount from the request above,
    // we deliberately ignore them to prevent manipulation

    // Get cart-level pricing information from the database (SECURE)
    // Calculate shipping on post-discount subtotal (BUG-018 fix)
    const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
    const shipping = calculateShipping(discountedSubtotal);
    const grandTotal = discountedSubtotal + shipping;

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

    // Add shipping to calculated total (no tax — GST exempt)
    const calculatedGrandTotal = calculatedTotal + shipping;

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
    if (result.data.shipping_amount !== undefined) {
      logger.warn('Security Alert: Client sent shipping amount (IGNORED)', {
        userId,
        cartId: cart_id,
        sentShippingAmount: result.data.shipping_amount,
        actualShippingAmount: shipping,
        message: 'Potential order manipulation attempt detected and blocked'
      });
    }

    const { data: checkoutSession, error: checkoutError } = await admin
      .from('checkout_sessions')
      .insert({
        cart_id,
        user_id: userId,
        status: payment_method === 'cod' ? 'completed' : 'payment_pending',
        payment_method: payment_method ?? 'cod',
        phone,
        shipping_name: shipping_name ?? null,
        shipping_line1: shipping_line1 ?? null,
        shipping_line2: shipping_line2 ?? null,
        city: shipping_city ?? null,
        state: shipping_state ?? null,
        postal_code: shipping_postal_code ?? null,
        country: shipping_country,
        shipping_method: shipping_method ?? 'standard',
        shipping_amount: shipping,
        tax_amount: 0,
        subtotal,
        total_amount: grandTotal,
        coupon_id: validatedCouponId,
        discount_amount: couponDiscount || 0,
        ...(guestEmail ? { guest_email: guestEmail } : {}),
        ...(guestPhone ? { guest_phone: guestPhone } : {}),
        ...(guestName ? { guest_name: guestName } : {}),
      } as any)
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
    // ── 4. Validate individual item prices (including variants) ──────────
    // Reuse admin client from line 41 instead of creating a second connection
    const adminClient = admin;
    for (const item of (cartItems || [])) {
      // If the cart item has a variant_id, validate against variant price
      // Otherwise validate against product base_price
      try {
        let expectedPrice: number;

        if (item.variant_id) {
          // FIX-C2: Validate variant price from product_variants table
          const { data: variantData, error: variantError } = await adminClient
            .from('product_variants')
            .select('price, product_id')
            .eq('id', item.variant_id)
            .maybeSingle();

          if (variantError) {
            logger.error('Price validation DB error', { variantError, variantId: item.variant_id });
            return NextResponse.json({ error: 'Price validation failed. Please try again.' }, { status: 500 });
          }

          if (variantData && variantData.price != null) {
            expectedPrice = variantData.price;
          } else {
            // Variant not found — fall back to product base_price
            const { data: productData } = await adminClient
              .from('products')
              .select('base_price')
              .eq('id', item.product_id)
              .maybeSingle();
            expectedPrice = productData?.base_price ?? item.unit_price;
          }
        } else {
          // No variant — validate against product base_price
          const { data: productData, error: productError } = await adminClient
            .from('products')
            .select('base_price')
            .eq('id', item.product_id)
            .maybeSingle();

          if (productError) {
            logger.error('Price validation DB error', { productError, productId: item.product_id });
            return NextResponse.json({ error: 'Price validation failed. Please try again.' }, { status: 500 });
          }

          expectedPrice = productData?.base_price ?? item.unit_price;
        }

        const actualPrice = item.unit_price;

        // Allow 1 paisa (0.01) rounding difference tolerance
        if (Math.abs(actualPrice - expectedPrice) > 0.01) {
          logger.warn('Security Alert: Item price mismatch', {
            userId,
            cartId: cart_id,
            productId: item.product_id,
            variantId: item.variant_id || null,
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
      } catch (priceError) {
        logger.error('Price validation failed', {
          productId: item.product_id,
          error: (priceError as Error).message
        });
        return NextResponse.json({ error: 'Price validation failed. Please try again.' }, { status: 500 });
      }
    }

    // ── 5. Atomic order creation via RPC ─────────────────────────────
    const shippingAddress = {
      name: shipping_name,
      phone,
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

    const { data: rpcResult, error: rpcError } = await admin.rpc(
      'create_order_from_checkout',
      {
        p_cart_id: cart_id,
        p_user_id: userId,
        p_payment_method: payment_method ?? 'cod',
        p_shipping_address: shippingAddress,
        p_tax_amount: 0,
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

    // ── 6.1 Increment coupon usage_count atomically ─────────────────────
    // OCC guard: .eq('usage_count', current) ensures no double-use in concurrent checkouts.
    if (validatedCouponId && couponUsageCountAtValidation !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: couponUpdateError } = await (admin as any)
        .from('coupons')
        .update({ usage_count: couponUsageCountAtValidation + 1 })
        .eq('id', validatedCouponId)
        .eq('usage_count', couponUsageCountAtValidation); // no-op if already incremented
      if (couponUpdateError) {
        logger.error('Failed to increment coupon usage_count', { error: couponUpdateError.message, couponId: validatedCouponId, orderId });
        // Non-fatal: order is committed, log the anomaly
      }
    }

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

    // PostHog server-side event
    try {
      const { PostHog } = await import('posthog-node');
      if (process.env.POSTHOG_KEY) {
        const ph = new PostHog(process.env.POSTHOG_KEY, { host: 'https://app.posthog.com' });
        ph.capture({
          distinctId: clerkUserId ?? userId,
          event: 'order_completed',
          properties: { order_id: orderId, order_number: orderNumber, total: grandTotal, payment_method: payment_method },
        });
        await ph.shutdown();
      }
    } catch {
      // PostHog is non-critical — swallow errors
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber,
        totals: {
          subtotal,
          discount: couponDiscount || 0,
          shipping,
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
