-- ===================================================================
-- Add Tracking Fields to Orders Table
-- ===================================================================
-- Allows admin to add a tracking number and URL to an order
-- after it ships.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url    TEXT;

-- Index for admin lookups by tracking number
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number
  ON public.orders (tracking_number)
  WHERE tracking_number IS NOT NULL;
