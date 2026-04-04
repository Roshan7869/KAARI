import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { CheckoutSchema } from '@/lib/validations/checkout.schema';
import type { Database } from '@/types/database';

type SupabaseResponse<T> = { data: T | null; error: null } | { data: null; error: Error };

/**
 * POST /api/checkout
 * Create checkout session and order from the active cart.
 * This server-side path avoids the currently broken database RPC.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const body = await request.json();

    const result = CheckoutSchema.safeParse(body);
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

    const { cart_id, payment_method, shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_method, shipping_amount, tax_amount } = result.data;

    interface CheckoutInsert {
      cart_id: string;
      user_id: string;
      status: string;
      payment_method?: string | null;
      shipping_name: string | null;
      shipping_line1: string | null;
      shipping_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string;
      shipping_method?: string | null;
      shipping_amount?: number;
      tax_amount?: number;
      subtotal: number;
      total_amount: number;
    }

    interface CartItemCustomization {
      customization_message: string | null;
      preferred_size: string | null;
      preferred_color: string | null;
      preferred_material: string | null;
      delivery_deadline: string | null;
      budget_min: number | null;
      budget_max: number | null;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's cart with items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cart, error: cartError } = await (supabase as any)
      .from('carts')
      .select(`
        id,
        user_id,
        status,
        currency,
        cart_items (
          id,
          product_id,
          variant_id,
          quantity,
          unit_price,
          line_total,
          item_type,
          products:product_id (id, title, slug, base_price, is_active, allow_customization),
          variants:variant_id (id, sku, size, color, material, price, stock_qty),
          cart_item_customizations (
            customization_message,
            preferred_size,
            preferred_color,
            preferred_material,
            delivery_deadline,
            budget_min,
            budget_max
          )
        )
      `)
      .eq('id', cart_id)
      .single() as SupabaseResponse<{ id: string; status: string; currency: string; cart_items: Array<unknown> }>;

    if (cartError || !cart) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 }
      );
    }

    if (cart.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Cart is not active' },
        { status: 400 }
      );
    }

    // Verify cart items exist and get product info
    const cartItems = (cart.cart_items || []) as Array<{
      id: string;
      product_id: string;
      item_type: 'standard' | 'customized';
      products: { allow_customization: boolean; base_price: number; title: string; is_active: boolean };
      unit_price: number;
      line_total: number;
      variant_id: string | null;
      variants: { id: string; stock_qty: number; price: number | null } | null;
      quantity: number;
      cart_item_customizations?: CartItemCustomization[] | null;
    }>;
    if (cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate stock for all items
    const validatedItems: Array<{
      id: string;
      product_id: string;
      item_type: 'standard' | 'customized';
      products: { allow_customization: boolean; base_price: number; title: string; is_active: boolean };
      unit_price: number;
      variant_id: string | null;
      variants: { id: string; stock_qty: number; price: number | null } | null;
      quantity: number;
      line_total: number;
      cart_item_customizations?: CartItemCustomization[] | null;
    }> = [];
    let totalAmount = 0;

    for (const item of cartItems) {
      if (!item.products?.is_active) {
        return NextResponse.json(
          { success: false, error: `${item.products?.title || 'A cart item'} is no longer available` },
          { status: 400 }
        );
      }

      let stock_qty = item.products.allow_customization ? 999 : 0;
      let unit_price = item.unit_price;

      if (item.variant_id && item.variants) {
        stock_qty = item.variants.stock_qty;
        unit_price = item.variants.price ?? item.products.base_price;
      }

      if (item.quantity > stock_qty) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${item.products.title}` },
          { status: 400 }
        );
      }

      validatedItems.push({
        ...item,
        unit_price,
        line_total: unit_price * item.quantity,
      });

      totalAmount += unit_price * item.quantity;
    }

    // Calculate totals
    const shipping = shipping_amount || 0;
    const tax = tax_amount || 0;
    const discount = 0;
    const grandTotal = totalAmount + shipping + tax - discount;

    // Create checkout session
    const checkoutData: CheckoutInsert = {
      cart_id: cart.id,
      user_id: user.id,
      status: payment_method === 'cod' ? 'completed' : 'payment_pending',
      payment_method: payment_method || 'cod',
      shipping_name: shipping_name ?? null,
      shipping_line1: shipping_line1 ?? null,
      shipping_line2: shipping_line2 ?? null,
      city: shipping_city ?? null,
      state: shipping_state ?? null,
      postal_code: shipping_postal_code ?? null,
      country: shipping_country,
      shipping_method: shipping_method || 'standard',
      shipping_amount: shipping,
      tax_amount: tax,
      subtotal: totalAmount,
      total_amount: grandTotal,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutResult = await (supabase as any)
      .from('checkout_sessions')
      .insert(checkoutData)
      .select()
      .single() as { data: Database['public']['Tables']['checkout_sessions']['Row'] | null; error: Error | null };

    if (checkoutResult.error) {
      throw checkoutResult.error;
    }
    const checkoutSession = checkoutResult.data as Database['public']['Tables']['checkout_sessions']['Row'];

    logger.info('Checkout session created', { checkoutId: checkoutSession.id });

    const orderStatus = payment_method === 'cod' ? 'placed' : 'payment_pending';
    const paymentStatus = payment_method === 'cod' ? 'pending' : 'initiated';
    const paymentProvider = payment_method === 'cod' ? 'cod' : 'cashfree';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = await (admin as any)
      .from('orders')
      .insert({
        user_id: user.id,
        checkout_session_id: checkoutSession.id,
        status: orderStatus,
        payment_status: paymentStatus,
        fulfillment_type: validatedItems.some((item) => item.item_type === 'customized') ? 'customized' : 'standard',
        subtotal: totalAmount,
        shipping_amount: shipping,
        tax_amount: tax,
        total_amount: grandTotal,
      })
      .select('id, order_number')
      .single() as { data: { id: string; order_number: string } | null; error: Error | null };

    if (orderError || !order) {
      throw orderError || new Error('Failed to create order');
    }

    for (const item of validatedItems) {
      const customization = item.cart_item_customizations?.[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: orderItemError } = await (admin as any)
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          customization_snapshot: customization || null,
        }) as { error: Error | null };

      if (orderItemError) {
        throw orderItemError;
      }

      if (item.variant_id && item.variants) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: stockError } = await (admin as any)
          .from('product_variants')
          .update({
            stock_qty: Math.max(0, item.variants.stock_qty - item.quantity),
          })
          .eq('id', item.variant_id) as { error: Error | null };

        if (stockError) {
          throw stockError;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: paymentError } = await (admin as any)
      .from('payments')
      .insert({
        order_id: order.id,
        provider: paymentProvider,
        amount: grandTotal,
        currency: cart.currency || 'INR',
        status: 'created',
      }) as { error: Error | null };

    if (paymentError) {
      throw paymentError;
    }

    // Mark the current cart as converted so repeat submits don't duplicate orders.
    const { error: cartUpdateError } = await admin
      .from('carts')
      .update({ status: 'converted' })
      .eq('id', cart.id);

    if (cartUpdateError) {
      throw cartUpdateError;
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        checkout: checkoutSession,
        items: validatedItems,
        totals: {
          subtotal: totalAmount,
          shipping,
          tax,
          discount,
          grandTotal,
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to create checkout', { message: err.message });
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create checkout',
      },
      { status: 500 }
    );
  }
}
