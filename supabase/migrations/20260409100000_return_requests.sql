-- ===================================================================
-- Return Requests Table: Customer Returns (RMA Portal)
-- ===================================================================

DROP TYPE IF EXISTS return_reason CASCADE;
CREATE TYPE return_reason AS ENUM (
  'damaged',
  'wrong_item',
  'quality',
  'changed_mind',
  'not_as_described'
);

DROP TYPE IF EXISTS return_status CASCADE;
CREATE TYPE return_status AS ENUM (
  'requested',
  'approved',
  'rejected',
  'in_transit',
  'received',
  'refunded'
);

CREATE TABLE IF NOT EXISTS return_requests (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id         TEXT          NOT NULL,    -- Clerk user ID
  items           JSONB         NOT NULL,    -- [{order_item_id, quantity, reason}]
  reason          return_reason NOT NULL,
  description     TEXT,
  photos          TEXT[]        DEFAULT ARRAY[]::TEXT[],
  status          return_status NOT NULL DEFAULT 'requested',
  admin_note      TEXT,
  refund_amount   NUMERIC,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS return_requests_updated_at_trigger ON return_requests;
CREATE TRIGGER return_requests_updated_at_trigger
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id  ON return_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status   ON return_requests (status, created_at DESC);

-- RLS
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_requests_service_all" ON return_requests;
CREATE POLICY "return_requests_service_all"
  ON return_requests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
