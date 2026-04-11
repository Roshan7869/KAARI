import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/wishlist - Get user's wishlist items
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = await createClient();

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
      console.error('Wishlist fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Unexpected wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wishlist - Toggle item in wishlist
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Get or create user's wishlist
    let { data: wishlist, error: wishlistError } = await supabaseAny
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (wishlistError && wishlistError.code !== 'PGRST116') { // Not found error
      console.error('Wishlist lookup error:', wishlistError);
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
        console.error('Wishlist creation error:', createError);
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
      console.error('Wishlist item check error:', checkError);
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
        console.error('Wishlist item removal error:', removeError);
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
        console.error('Wishlist item addition error:', addError);
        return NextResponse.json({ error: 'Failed to add item to wishlist' }, { status: 500 });
      }

      actionResult = { action: 'added', wishlisted: true };
    }

    return NextResponse.json(actionResult);
  } catch (error) {
    console.error('Unexpected wishlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}