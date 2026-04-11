-- ===================================================================
-- Coupons Table: Discount Code System
-- ===================================================================

DROP TYPE IF EXISTS coupon_type CASCADE;
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');

CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT        NOT NULL UNIQUE,  -- e.g. 'WELCOME10'
  type                coupon_type NOT NULL,
  value               NUMERIC     NOT NULL CHECK (value > 0),
  min_order_amount    NUMERIC     NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC,    -- cap for percentage coupons
  usage_limit         INTEGER,    -- NULL = unlimited
  usage_count         INTEGER     NOT NULL DEFAULT 0,
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until         TIMESTAMPTZ,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize code to uppercase on insert/update
CREATE OR REPLACE FUNCTION normalize_coupon_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code = UPPER(TRIM(NEW.code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_coupon_code_trigger ON coupons;
CREATE TRIGGER normalize_coupon_code_trigger
  BEFORE INSERT OR UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION normalize_coupon_code();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active, valid_from, valid_until);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_service_all" ON coupons;
CREATE POLICY "coupons_service_all"
  ON coupons FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Public can read active coupons (validation happens server-side)
DROP POLICY IF EXISTS "coupons_public_read_active" ON coupons;
CREATE POLICY "coupons_public_read_active"
  ON coupons FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Add coupon_code to orders table for tracking which coupon was applied
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code        TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount     NUMERIC DEFAULT 0;
