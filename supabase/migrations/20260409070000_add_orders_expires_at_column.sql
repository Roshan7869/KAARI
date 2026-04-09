-- Migration: Add expires_at column to orders table
-- Description: Track order expiration time for cleanup purposes

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_orders_expires_at
  ON public.orders (expires_at)
  WHERE expires_at IS NOT NULL;

-- Grant permissions (inherits from existing table)