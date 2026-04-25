import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken } from '@/lib/csrf-server';
import { applyRateLimit } from '@/lib/server-rate-limit';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/auth-client';
import { logger } from '@/lib/logger-server';
import { WishlistToggleSchema } from '@/lib/validations/payment.schema';

// GET /api/wishlist - Get user's wishlist items
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = await createUserClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get wishlist items with product details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items, error } = await (supabase as any)
      .from('wishlist_items')
      .select(`
        id,
        added_at,
        products (
          id,
          title,
          slug,
          base_price,
          media (file_path, alt_text)
        )
      `)
      .eq('wishlists.user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      logger.error('Wishlist fetch error', error, { context: 'wishlist-get' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    logger.error('Unexpected wishlist error', error, { context: 'wishlist-get' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wishlist - Toggle item in wishlist
export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, 'mutation');
  if (rateLimitResponse) return rateLimitResponse;

  const csrfValid = await validateCsrfToken(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WishlistToggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 });
    }
    const { productId } = parsed.data;

    const supabase = await createUserClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Get or create user's wishlist
    let { data: wishlist, error: wishlistError } = await supabaseAny
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (wishlistError && wishlistError.code !== 'PGRST116') { // Not found error
      logger.error('Wishlist lookup error', wishlistError, { context: 'wishlist-post' });
      return NextResponse.json({ error: 'Failed to find wishlist' }, { status: 500 });
    }

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      const { data: newWishlist, error: createError } = await supabaseAny
        .from('wishlists')
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (createError) {
        logger.error('Wishlist creation error', createError, { context: 'wishlist-post' });
        return NextResponse.json({ error: 'Failed to create wishlist' }, { status: 500 });
      }

      wishlist = newWishlist;
    }

    // Check if item is already in wishlist
    const { data: existingItem, error: checkError } = await supabaseAny
      .from('wishlist_items')
      .select('id')
      .eq('wishlist_id', wishlist.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError) {
      logger.error('Wishlist item check error', checkError, { context: 'wishlist-post' });
      return NextResponse.json({ error: 'Failed to check wishlist item' }, { status: 500 });
    }

    let actionResult;

    if (existingItem) {
      // Remove from wishlist
      const { error: removeError } = await supabaseAny
        .from('wishlist_items')
        .delete()
        .eq('id', existingItem.id);

      if (removeError) {
        logger.error('Wishlist item removal error', removeError, { context: 'wishlist-post' });
        return NextResponse.json({ error: 'Failed to remove item from wishlist' }, { status: 500 });
      }

      actionResult = { action: 'removed', wishlisted: false };
    } else {
      // Add to wishlist
      const { error: addError } = await supabaseAny
        .from('wishlist_items')
        .insert({
          wishlist_id: wishlist.id,
          product_id: productId,
          added_at: new Date().toISOString()
        });

      if (addError) {
        logger.error('Wishlist item addition error', addError, { context: 'wishlist-post' });
        return NextResponse.json({ error: 'Failed to add item to wishlist' }, { status: 500 });
      }

      actionResult = { action: 'added', wishlisted: true };
    }

    return NextResponse.json(actionResult);
  } catch (error) {
    logger.error('Unexpected wishlist error', error, { context: 'wishlist-post' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}