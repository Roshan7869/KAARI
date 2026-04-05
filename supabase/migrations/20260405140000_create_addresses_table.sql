-- ===================================================================
-- Customer Saved Addresses Table
-- Allows customers to save multiple delivery addresses for quick checkout
-- ===================================================================

CREATE TABLE IF NOT EXISTS addresses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT        NOT NULL DEFAULT 'Home',                    -- e.g. "Home", "Office", "Parents"
  full_name       TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  address_line1   TEXT        NOT NULL,
  address_line2   TEXT,                                                   -- Optional
  city            TEXT        NOT NULL,
  state           TEXT        NOT NULL,
  postal_code     TEXT        NOT NULL,
  country         CHAR(2)     NOT NULL DEFAULT 'IN',                      -- ISO country code
  is_default      BOOLEAN     NOT NULL DEFAULT false,                     -- Mark as default for checkout
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────

-- Fast lookup of user's addresses sorted by is_default and recency
CREATE INDEX IF NOT EXISTS idx_addresses_user_id_default
  ON addresses (user_id, is_default DESC, created_at DESC);

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Users can view/manage only their own addresses
CREATE POLICY "addresses_user_read"
  ON addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "addresses_user_insert"
  ON addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_user_update"
  ON addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_user_delete"
  ON addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_addresses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_addresses_updated_at();
