-- ===================================================================
-- Webhook Events Table: Idempotent Webhook Processing
-- ===================================================================
-- Problem: Payment webhooks (SUCCESS, FAILED, etc.) can be reprocessed,
--          causing state flip-flops (e.g., order status: paid → failed → paid)
-- Solution: Store all webhook events and deduplicate by cf_payment_id + event_type
--           This ensures all events (not just SUCCESS) are idempotent.

CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cf_payment_id   TEXT        NOT NULL,                -- Cashfree payment ID
  event_type      TEXT        NOT NULL,                -- 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', etc.
  cashfree_session_id UUID    NOT NULL REFERENCES cashfree_sessions(id) ON DELETE CASCADE,
  result          JSONB       NOT NULL,                -- { newStatus, oldStatus, timestamp, message }
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite unique: each (payment, event_type) processed once
  CONSTRAINT webhook_events_unique_payment_event
    UNIQUE (cf_payment_id, event_type, cashfree_session_id)
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

-- Public can't read (webhook events should be internal only)
CREATE POLICY "webhook_events_deny_all"
  ON webhook_events FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- Services can insert (via trigger or Edge Function)
CREATE POLICY "webhook_events_service_insert"
  ON webhook_events FOR INSERT
  TO SERVICE_ROLE
  WITH CHECK (true);

-- ── Cleanup Policy ──────────────────────────────────────────────

-- Delete webhook events older than 90 days (keep for audit)
-- Run manually: DELETE FROM webhook_events WHERE created_at < now() - interval '90 days'
-- Or use pg_cron extension (if available in your Supabase tier)

-- ===================================================================
-- Webhook Event Result Schema Documentation
-- ===================================================================
-- The `result` JSONB column stores:
-- {
--   "newStatus": "paid" | "failed" | "expired",
--   "oldStatus": "initiated" | "pending" | "paid" | "failed",
--   "timestamp": "2026-04-05T12:34:56Z",
--   "message": "Payment succeeded",
--   "orderStatus": "payment_pending" → "paid"
-- }
