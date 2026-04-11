-- Wishlist Tables Migration
-- Creates tables for user wishlist functionality with proper RLS policies

-- Create wishlists table (one per user)
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create wishlist_items table (products in wishlist)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wishlist_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product ON wishlist_items(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- Enable Row Level Security
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlists
-- Users can view and manage their own wishlist
CREATE POLICY "Users can manage their own wishlist"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all wishlists (for support/debugging)
CREATE POLICY "Admins can view all wishlists"
  ON public.wishlists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for wishlist_items
-- Users can manage items in their own wishlist
CREATE POLICY "Users can manage their wishlist items"
  ON public.wishlist_items FOR ALL
  USING (
    wishlist_id IN (SELECT id FROM wishlists WHERE user_id = auth.uid())
  )
  WITH CHECK (
    wishlist_id IN (SELECT id FROM wishlists WHERE user_id = auth.uid())
  );

-- Admins can view all wishlist items (for support/debugging)
CREATE POLICY "Admins can view all wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_wishlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS tr_wishlists_updated_at ON public.wishlists;
CREATE TRIGGER tr_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wishlists_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.wishlists IS 'User wishlists - one per user for saving favorite products';
COMMENT ON TABLE public.wishlist_items IS 'Individual items saved to user wishlists';
COMMENT ON COLUMN public.wishlists.user_id IS 'Reference to the user who owns this wishlist';
COMMENT ON COLUMN public.wishlist_items.wishlist_id IS 'Reference to the wishlist containing this item';
COMMENT ON COLUMN public.wishlist_items.product_id IS 'Reference to the product saved in the wishlist';