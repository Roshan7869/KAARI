-- Product Reviews Migration
-- Creates the product_reviews table with RLS policies, indexes, and triggers for review management
-- Merged from 20260328100000 and 20260328120000 - includes soft delete, status enum, and rating aggregates

-- First, add columns to products table for rating aggregation
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT NULL CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00)),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0 CHECK (review_count >= 0);

-- Create review_status enum using CHECK constraint (consistent with project patterns)
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    helpful_count INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
    status public.review_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    -- Ensure user can only review a product once (excluding soft-deleted)
    CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
);

-- Partial unique index to allow re-review after soft delete
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product_active
ON public.product_reviews(user_id, product_id)
WHERE deleted_at IS NULL;

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id) WHERE deleted_at IS NULL;

-- Create index on user_id for user review lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id) WHERE deleted_at IS NULL;

-- Create index on order_id for order verification lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON public.product_reviews(order_id) WHERE order_id IS NOT NULL;

-- Create index on status for moderation queries
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);

-- Create composite index for common queries (approved reviews by product, sorted by date)
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_created
ON public.product_reviews(product_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- Create index for verified purchase filtering
CREATE INDEX IF NOT EXISTS idx_product_reviews_verified ON public.product_reviews(product_id, is_verified_purchase)
WHERE is_verified_purchase = true AND deleted_at IS NULL;

-- Create index for helpful count sorting
CREATE INDEX IF NOT EXISTS idx_product_reviews_helpful ON public.product_reviews(helpful_count DESC)
WHERE status = 'approved' AND deleted_at IS NULL;

-- Create index on rating for analytics
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating)
WHERE status = 'approved' AND deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy 1: Anyone can view approved reviews for active products
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (
    status = 'approved' AND
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_reviews.product_id AND is_active = true
    )
  );

-- Policy 2: Users can view their own reviews regardless of status
CREATE POLICY "Users can view their own reviews"
  ON public.product_reviews FOR SELECT
  USING (
    auth.uid() = user_id AND deleted_at IS NULL
  );

-- Policy 3: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
  ON public.product_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 4: Authenticated users can insert their own reviews
CREATE POLICY "Users can insert their own reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy 5: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews FOR UPDATE
  USING (
    auth.uid() = user_id AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy 6: Admins can update any review (for moderation)
CREATE POLICY "Admins can update any review"
  ON public.product_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 7: Users can soft-delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.product_reviews FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Policy 8: Admins can delete any review
CREATE POLICY "Admins can delete any review"
  ON public.product_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to auto-set is_verified_purchase based on order
CREATE OR REPLACE FUNCTION set_verified_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If order_id is provided, verify the user actually purchased this product
    IF NEW.order_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.id = NEW.order_id
            AND o.user_id = NEW.user_id
            AND oi.product_id = NEW.product_id
            AND o.status IN ('delivered', 'paid', 'shipped')
        ) INTO NEW.is_verified_purchase;
    ELSE
        -- Check if user ever purchased this product
        SELECT EXISTS (
            SELECT 1 FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = NEW.user_id
            AND oi.product_id = NEW.product_id
            AND o.status IN ('delivered', 'paid', 'shipped')
        ) INTO NEW.is_verified_purchase;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to auto-verify purchases
DROP TRIGGER IF EXISTS trigger_set_verified_purchase ON public.product_reviews;
CREATE TRIGGER trigger_set_verified_purchase
    BEFORE INSERT ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION set_verified_purchase();

-- Function to update product rating aggregates
CREATE OR REPLACE FUNCTION public.update_product_rating_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT: new approved review
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' AND NEW.deleted_at IS NULL THEN
      UPDATE public.products
      SET
        average_rating = (
          (COALESCE(average_rating * review_count, 0) + NEW.rating) /
          (review_count + 1)
        ),
        review_count = review_count + 1,
        updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;

  -- Handle UPDATE: rating or status changed
  ELSIF TG_OP = 'UPDATE' THEN
    -- Case 1: Status changed from pending/rejected to approved
    IF OLD.status != 'approved' AND NEW.status = 'approved' AND NEW.deleted_at IS NULL THEN
      UPDATE public.products
      SET
        average_rating = (
          (COALESCE(average_rating * review_count, 0) + NEW.rating) /
          (review_count + 1)
        ),
        review_count = review_count + 1,
        updated_at = NOW()
      WHERE id = NEW.product_id;

    -- Case 2: Status changed from approved to not approved OR soft-deleted
    ELSIF OLD.status = 'approved' AND (NEW.status != 'approved' OR NEW.deleted_at IS NOT NULL) THEN
      UPDATE public.products
      SET
        average_rating = CASE
          WHEN review_count <= 1 THEN NULL
          ELSE (average_rating * review_count - OLD.rating) / (review_count - 1)
        END,
        review_count = review_count - 1,
        updated_at = NOW()
      WHERE id = NEW.product_id;

    -- Case 3: Soft-delete restored (undeleted) - add back to aggregates
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.status = 'approved' THEN
      UPDATE public.products
      SET
        average_rating = (
          (COALESCE(average_rating * review_count, 0) + NEW.rating) /
          (review_count + 1)
        ),
        review_count = review_count + 1,
        updated_at = NOW()
      WHERE id = NEW.product_id;

    -- Case 4: Rating changed on already approved review
    ELSIF OLD.status = 'approved' AND NEW.status = 'approved' AND OLD.rating != NEW.rating AND NEW.deleted_at IS NULL THEN
      UPDATE public.products
      SET
        average_rating = (
          (average_rating * review_count - OLD.rating + NEW.rating) /
          review_count
        ),
        updated_at = NOW()
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;

  -- Handle DELETE: remove review from aggregates
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' AND OLD.deleted_at IS NULL THEN
      UPDATE public.products
      SET
        average_rating = CASE
          WHEN review_count <= 1 THEN NULL
          ELSE (average_rating * review_count - OLD.rating) / (review_count - 1)
        END,
        review_count = review_count - 1,
        updated_at = NOW()
      WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product rating on review changes
DROP TRIGGER IF EXISTS tr_update_product_rating ON public.product_reviews;
CREATE TRIGGER tr_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating_aggregates();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_product_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS tr_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER tr_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_reviews_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.product_reviews IS 'Customer reviews for products with moderation workflow and soft delete';
COMMENT ON COLUMN public.product_reviews.product_id IS 'Reference to the product being reviewed';
COMMENT ON COLUMN public.product_reviews.user_id IS 'Reference to the user who wrote the review';
COMMENT ON COLUMN public.product_reviews.order_id IS 'Optional reference to verify purchase (for verified purchase badge)';
COMMENT ON COLUMN public.product_reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN public.product_reviews.is_verified_purchase IS 'True if the reviewer purchased this product';
COMMENT ON COLUMN public.product_reviews.helpful_count IS 'Number of users who found this review helpful';
COMMENT ON COLUMN public.product_reviews.status IS 'Moderation status: pending, approved, or rejected';
COMMENT ON COLUMN public.product_reviews.approved_at IS 'Timestamp when the review was approved by an admin';
COMMENT ON COLUMN public.product_reviews.deleted_at IS 'Soft delete timestamp - null if not deleted';
COMMENT ON COLUMN public.products.average_rating IS 'Calculated average of all approved reviews (1.00 - 5.00)';
COMMENT ON COLUMN public.products.review_count IS 'Total number of approved, non-deleted reviews';
