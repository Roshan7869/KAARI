-- ===================================================================
-- Cart Idempotency: Prevent Double-Checkout Attacks
-- ===================================================================
-- Problem: Cart can be marked 'converted' twice by concurrent checkout
--          requests, resulting in duplicate orders from same cart.
-- Solution: Add converted_at column and unique constraint to ensure
--           each cart can only be converted once.

-- Add column to track when cart was converted
ALTER TABLE carts ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Create unique constraint: Each cart can be converted at most once
-- This works because:
--   - First checkout: status='converted', converted_at=now() ✓
--   - Concurrent checkout: attempts same, violates UNIQUE constraint ✗ (409 Conflict)
-- Note: UNIQUE allows multiple NULLs, so unattempted carts don't conflict
ALTER TABLE carts
  ADD CONSTRAINT IF NOT EXISTS carts_only_convert_once
  UNIQUE (id, converted_at);

-- Index for checking idempotency + performance
CREATE INDEX IF NOT EXISTS idx_carts_status_converted_at
  ON carts (user_id, status, converted_at DESC, updated_at DESC);

-- Audit: Track of which carts have been converted
CREATE INDEX IF NOT EXISTS idx_carts_converted_at
  ON carts (converted_at DESC)
  WHERE converted_at IS NOT NULL;

-- ===================================================================
-- Cart Conversion Idempotency Check (Helper Function)
-- ===================================================================
CREATE OR REPLACE FUNCTION can_convert_cart(p_cart_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if cart can be converted (hasn't been already)
  RETURN (
    SELECT converted_at IS NULL
    FROM carts
    WHERE id = p_cart_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
