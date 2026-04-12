-- Product Enhancements Migration
-- Adds compare_at_price, sold_count, and season_tag to products table
-- These fields power the redesigned products listing and detail pages

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2) DEFAULT NULL
    CHECK (compare_at_price IS NULL OR compare_at_price > 0),
  ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0
    CHECK (sold_count >= 0),
  ADD COLUMN IF NOT EXISTS season_tag TEXT DEFAULT NULL;

-- Index for sorting by sold_count (Most Popular sort option)
CREATE INDEX IF NOT EXISTS idx_products_sold_count
  ON public.products(sold_count DESC)
  WHERE is_active = true;

-- Index for sorting by average_rating (Best Rated sort option)
CREATE INDEX IF NOT EXISTS idx_products_average_rating
  ON public.products(average_rating DESC NULLS LAST)
  WHERE is_active = true;
