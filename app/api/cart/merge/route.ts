import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/csrf-server';
import { applyRateLimit } from '@/lib/server-rate-limit';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/auth-client';
import { requireSupabaseUserId } from '@/lib/clerk-to-supabase';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const MergeItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  title: z.string().min(1),
  image: z.string().optional(),
  variantSize: z.string().optional(),
  variantColor: z.string().optional(),
  variantMaterial: z.string().optional(),
  itemType: z.enum(['standard', 'customized']),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().min(0),
  customization: z.object({
    message: z.string(),
    preferredSize: z.string().optional(),
    preferredColor: z.string().optional(),
    preferredMaterial: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
    quoteStatus: z.string().optional(),
    requiresManualReview: z.boolean().optional(),
  }).optional(),
});

const MergeSchema = z.object({
  items: z.array(MergeItemSchema).min(1).max(50),
});

type SupabaseError = Error & { code?: string };
type SupabaseResponse<T> = { data: T | null; error: SupabaseError | null };

/**
 * POST /api/cart/merge
 *
 * Merges guest cart items into the authenticated user's server cart.
 * Called after login to transfer localStorage items to the database.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await applyRateLimit(request, 'mutation');
  if (rateLimitResponse) return rateLimitResponse;

  const csrfValid = await validateCsrfToken(request);
  if (!csrfValid) {
    return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
  }

  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await requireSupabaseUserId(clerkUserId);

    const body = await request.json();
    const validation = MergeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid items format', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { items } = validation.data;
    const supabase = await createUserClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create the user's active cart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartResult = await (supabase as any)
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as SupabaseResponse<{ id: string }>;

    if (cartResult.error) throw cartResult.error;
    let cartId: string;

    if (!cartResult.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newCartResult = await (supabase as any)
        .from('carts')
        .insert({ user_id: userId, status: 'active', currency: 'INR' })
        .select()
        .single() as SupabaseResponse<{ id: string }>;

      if (newCartResult.error) {
        // Handle race condition
        if (newCartResult.error.code === '23505') {
          const { data: existingCart, error: fetchError } = await supabase
            .from('carts')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fetchError || !existingCart) {
            throw fetchError || new Error('Cart creation conflict and fallback fetch failed');
          }
          cartId = existingCart.id;
        } else {
          throw newCartResult.error;
        }
      } else {
        cartId = newCartResult.data!.id;
      }
    } else {
      cartId = cartResult.data.id;
    }

    let merged = 0;
    let skipped = 0;

    for (const item of items) {
      // Check if this product+variant is already in the cart
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingResult = await (supabase as any)
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', item.productId)
        .eq('variant_id', item.variantId ?? null)
        .maybeSingle() as SupabaseResponse<{ id: string; quantity: number }>;

      if (existingResult.error) {
        logger.warn('Merge: failed to check existing item', { error: existingResult.error.message });
        skipped++;
        continue;
      }

      if (existingResult.data) {
        // Update quantity of existing item
        const newQty = existingResult.data.quantity + item.quantity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateResult = await (supabase as any)
          .from('cart_items')
          .update({
            quantity: newQty,
            line_total: item.unitPrice * newQty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResult.data.id);

        if (updateResult.error) {
          logger.warn('Merge: failed to update existing item', { error: updateResult.error.message });
          skipped++;
        } else {
          merged++;
        }
      } else {
        // Insert new item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertResult = await (supabase as any)
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.unitPrice * item.quantity,
            item_type: item.itemType,
          })
          .select('id')
          .maybeSingle() as SupabaseResponse<{ id: string }>;

        if (insertResult.error) {
          logger.warn('Merge: failed to insert item', { error: insertResult.error.message });
          skipped++;
          continue;
        }

        // Insert customization if provided
        if (item.customization && insertResult.data) {
          const { error: customError } = await supabase
            .from('cart_item_customizations')
            .insert({
              cart_item_id: insertResult.data.id,
              customization_message: item.customization.message,
              preferred_size: item.customization.preferredSize ?? null,
              preferred_color: item.customization.preferredColor ?? null,
              preferred_material: item.customization.preferredMaterial ?? null,
              delivery_deadline: item.customization.deliveryDeadline ?? null,
              budget_min: item.customization.budgetMin ?? null,
              budget_max: item.customization.budgetMax ?? null,
              quote_status: item.customization.quoteStatus ?? 'not_needed',
              requires_manual_review: item.customization.requiresManualReview ?? false,
            });

          if (customError) {
            logger.warn('Merge: failed to insert customization', { error: customError.message });
          }
        }

        merged++;
      }
    }

    logger.info('Guest cart merged', { userId, merged, skipped, total: items.length });

    return NextResponse.json({
      success: true,
      merged,
      skipped,
      total: items.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to merge guest cart', { message: err.message });
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to merge cart' },
      { status: 500 }
    );
  }
}