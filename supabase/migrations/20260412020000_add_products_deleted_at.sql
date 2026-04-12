-- ============================================================
-- Add deleted_at column to products table
-- The useDeleteProduct hook writes to this column but it was
-- never added to the products table. This enables proper soft-delete.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for querying active (non-deleted) products efficiently
CREATE INDEX IF NOT EXISTS idx_products_not_deleted
  ON public.products (id)
  WHERE deleted_at IS NULL;