-- ===================================================================
-- Webhook Events Table: Idempotent Webhook Processing
-- ===================================================================
-- Problem: Payment webhooks (SUCCESS, FAILED, etc.) can be reprocessed,
--          causing state flip-flops (e.g., order status: paid → failed → paid)
-- Solution: Store all webhook events and deduplicate by cf_payment_id + event_type
--           This ensures all events (not just SUCCESS) are idempotent.

CREATE TABLE IF NOT EXISTS webhook_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cf_payment_id       TEXT        NOT NULL,                -- Cashfree payment ID
  event_type          TEXT        NOT NULL,                -- 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', etc.
  order_id            UUID,                                -- Optional: Reference to orders table
  status              TEXT        NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, PROCESSED, FAILED
  result              JSONB,                                   -- { newStatus, oldStatus, timestamp, message }
  error               TEXT,                                    -- error message if status = FAILED
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,                             -- set when status → PROCESSED or FAILED
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite unique: each (payment, event_type) processed once
  CONSTRAINT webhook_events_unique_payment_event
    UNIQUE (cf_payment_id, event_type)
);

-- ── Indexes ───────────────────────────────────────────────────────

-- Fast lookup by payment ID for idempotency checks
CREATE INDEX IF NOT EXISTS idx_webhook_events_cf_payment_id
  ON webhook_events (cf_payment_id);

-- Fast lookup by event type for analytics
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type
  ON webhook_events (event_type, received_at DESC);

-- Cleanup: Find old/stale webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON webhook_events (created_at DESC);

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "webhook_events_deny_all" ON webhook_events;
DROP POLICY IF EXISTS "webhook_events_service_insert" ON webhook_events;
DROP POLICY IF EXISTS "webhook_events_service_update" ON webhook_events;
DROP POLICY IF EXISTS "webhook_events_service_select" ON webhook_events;

-- Public can't read (webhook events should be internal only)
CREATE POLICY "webhook_events_deny_all"
  ON webhook_events FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- Services can insert and update (webhook route inserts on receive, updates on process/fail)
CREATE POLICY "webhook_events_service_insert"
  ON webhook_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "webhook_events_service_update"
  ON webhook_events FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "webhook_events_service_select"
  ON webhook_events FOR SELECT
  TO service_role
  USING (true);

-- ── Cleanup Policy ──────────────────────────────────────────────

-- Delete webhook events older than 90 days (keep for audit)
-- Run manually: DELETE FROM webhook_events WHERE created_at < now() - interval '90 days'
-- Or use pg_cron extension (if available in your Supabase tier)
