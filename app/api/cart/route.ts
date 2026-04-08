import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { validateBody } from '@/lib/api-validate';
import { z } from 'zod';
import type { Database } from '@/types/database';

const AddToCartSchema = z.object({
  product_id: z.string().uuid('product_id must be a valid UUID'),
  variant_id:  z.string().uuid().optional(),
  quantity:    z.coerce.number().int().min(1).max(100).default(1),
  customization: z.object({
    message: z.string(),
    preferredSize: z.string().optional(),
    preferredColor: z.string().optional(),
    preferredMaterial: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
    quoteStatus: z.enum(['not_needed', 'pending', 'approved', 'rejected']).optional(),
    requiresManualReview: z.boolean().optional(),
  }).optional(),
});

type SupabaseError = Error & { code?: string };

type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

/**
 * GET /api/cart
 * Get current user's cart
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartResult = await (supabase as any)
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as SupabaseResponse<Database['public']['Tables']['carts']['Row']>;

    if (cartResult.error) throw cartResult.error;
    let cart = cartResult.data as Database['public']['Tables']['carts']['Row'] | null;

    if (!cart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCartResult = await (supabase as any)
        .from('carts')
        .insert({ user_id: userId, status: 'active', currency: 'INR' })
        .select()
        .single() as SupabaseResponse<Database['public']['Tables']['carts']['Row']>;

      if (newCartResult.error) throw newCartResult.error;
      cart = newCartResult.data as Database['public']['Tables']['carts']['Row'];

      logger.debug('Created new cart', { cartId: cart.id });

      return NextResponse.json({
        success: true,
        data: { cart, items: [], total: 0, subtotal: 0, shipping: 0, tax: 0 },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsResult = await (supabase as any)
      .from('cart_items')
      .select(`
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
          *,
          customization_uploads (*)
        )
      `)
      .eq('cart_id', cart.id) as SupabaseResponse<Array<Record<string, unknown>>>;

    if (itemsResult.error) throw itemsResult.error;
    const items = itemsResult.data || [];

    const subtotal = items.reduce((sum, item) => sum + (item.line_total as number), 0);
    const shipping = subtotal > 0 ? 99 : 0;
    const tax = 0;
    const total = subtotal + shipping + tax;

    logger.debug('Got cart', { cartId: cart.id, item_count: items.length });

    return NextResponse.json({
      success: true,
      data: { cart, items, total, subtotal, shipping, tax },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to get cart', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Add item to cart
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateBody(request, AddToCartSchema);
    if ('error' in validation) return validation.error;
    const { product_id, variant_id, quantity = 1, customization } = validation.data;

    const supabase = createAdminClient();

    // Get or create active cart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartResult = await (supabase as any)
      .from('carts')
      .select('id, user_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as SupabaseResponse<Pick<Database['public']['Tables']['carts']['Row'], 'id' | 'user_id'>>;

    if (cartResult.error) throw cartResult.error;
    let cartId: string;

    if (!cartResult.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCartResult = await (supabase as any)
        .from('carts')
        .insert({ user_id: userId, status: 'active', currency: 'INR' })
        .select()
        .single() as SupabaseResponse<Database['public']['Tables']['carts']['Row']>;

      if (newCartResult.error) throw newCartResult.error;
      cartId = (newCartResult.data as Database['public']['Tables']['carts']['Row']).id;
    } else {
      cartId = (cartResult.data as Database['public']['Tables']['carts']['Row']).id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productResult = await (supabase as any)
      .from('products')
      .select('id, is_active, base_price, allow_customization')
      .eq('id', product_id)
      .single() as SupabaseResponse<{ id: string; is_active: boolean; base_price: number; allow_customization: boolean }>;

    if (productResult.error || !productResult.data) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    const product = productResult.data as { id: string; is_active: boolean; base_price: number; allow_customization: boolean };

    if (!product.is_active) {
      return NextResponse.json({ success: false, error: 'Product is not active' }, { status: 400 });
    }

    let stock_qty = product.allow_customization ? 999 : 0;
    let unit_price = product.base_price;

    if (variant_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantResult = await (supabase as any)
        .from('product_variants')
        .select('stock_qty, price, is_default')
        .eq('id', variant_id)
        .eq('product_id', product_id)
        .single() as SupabaseResponse<{ stock_qty: number; price: number | null; is_default: boolean }>;

      if (variantResult.data) {
        stock_qty = variantResult.data.stock_qty;
        unit_price = variantResult.data.price ?? product.base_price;
      } else if (!product.allow_customization) {
        return NextResponse.json({ success: false, error: 'Invalid variant' }, { status: 400 });
      }
    }

    if (quantity > stock_qty) {
      return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });
    }

    const line_total = unit_price * quantity;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingItemResult = await (supabase as any)
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', product_id)
      .eq('variant_id', variant_id ?? null)
      .maybeSingle() as SupabaseResponse<{ id: string; quantity: number }>;

    let newItem: Database['public']['Tables']['cart_items']['Row'];

    if (existingItemResult.data) {
      const newQuantity = existingItemResult.data.quantity + quantity;
      if (newQuantity > stock_qty) {
        return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedResult = await (supabase as any)
        .from('cart_items')
        .update({ quantity: newQuantity, line_total: unit_price * newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingItemResult.data.id)
        .select()
        .single() as SupabaseResponse<Database['public']['Tables']['cart_items']['Row']>;

      if (updatedResult.error) throw updatedResult.error;
      newItem = updatedResult.data as Database['public']['Tables']['cart_items']['Row'];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertedResult = await (supabase as any)
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_id,
          variant_id,
          quantity,
          unit_price,
          line_total,
          item_type: variant_id ? 'standard' : (product.allow_customization ? 'customized' : 'standard'),
        })
        .select()
        .single() as SupabaseResponse<Database['public']['Tables']['cart_items']['Row']>;

      if (insertedResult.error) throw insertedResult.error;
      newItem = insertedResult.data as Database['public']['Tables']['cart_items']['Row'];
    }

    // Insert customization record if provided
    if (customization) {
      const { error: customError } = await supabase
        .from('cart_item_customizations')
        .insert({
          cart_item_id: newItem.id,
          customization_message: customization.message,
          preferred_size: customization.preferredSize ?? null,
          preferred_color: customization.preferredColor ?? null,
          preferred_material: customization.preferredMaterial ?? null,
          delivery_deadline: customization.deliveryDeadline ?? null,
          budget_min: customization.budgetMin ?? null,
          budget_max: customization.budgetMax ?? null,
          quote_status: customization.quoteStatus ?? 'not_needed',
          requires_manual_review: customization.requiresManualReview ?? false,
        });
      if (customError) throw customError;
    }

    logger.info('Added to cart', { cartId, productId: product_id, quantity });

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to add to cart', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 * Clear entire cart
 */
export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartResult = await (supabase as any)
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as SupabaseResponse<Pick<Database['public']['Tables']['carts']['Row'], 'id'>>;

    if (cartResult.error) throw cartResult.error;
    const cart = cartResult.data as Database['public']['Tables']['carts']['Row'] | null;

    if (!cart) {
      return NextResponse.json({ success: false, error: 'No active cart found' }, { status: 404 });
    }

    const deleteResult = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (deleteResult.error) throw deleteResult.error;

    logger.info('Cart cleared', { cartId: cart.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to clear cart', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to clear cart' },
      { status: 500 }
    );
  }
}
