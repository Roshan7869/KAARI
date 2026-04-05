-- ===================================================================
-- Billboard Products Table
-- Admin-controlled selection of products displayed in the homepage
-- hero billboard carousel.
-- ===================================================================

CREATE TABLE IF NOT EXISTS billboard_products (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order  INT         NOT NULL DEFAULT 0,
  tag            TEXT,                         -- e.g. "New Arrival", "Bestseller"
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure product appears at most once on the billboard
ALTER TABLE billboard_products
  ADD CONSTRAINT billboard_products_product_id_unique UNIQUE (product_id);

-- Fast ordered reads for homepage
CREATE INDEX IF NOT EXISTS idx_billboard_display_order
  ON billboard_products (display_order ASC);

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE billboard_products ENABLE ROW LEVEL SECURITY;

-- Public can read active billboard products (homepage does this without auth)
CREATE POLICY "billboard_public_read"
  ON billboard_products FOR SELECT
  TO public
  USING (is_active = true);

-- Admins have full control
CREATE POLICY "billboard_admin_all"
  ON billboard_products FOR ALL
  TO authenticated
  USING     (has_role('admin', auth.uid()))
  WITH CHECK (has_role('admin', auth.uid()));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_billboard_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_billboard_updated_at
  BEFORE UPDATE ON billboard_products
  FOR EACH ROW EXECUTE FUNCTION update_billboard_updated_at();
