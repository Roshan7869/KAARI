-- ===================================================================
-- Webhook Retry & Dead-Letter Queue
-- ===================================================================
-- Problem: Failed webhook events stay in FAILED status forever with no retry.
-- Solution: Add retry_count, next_retry_at columns and DEAD_LETTER status
--           so a cron job can re-process failed events with exponential backoff.

-- Add retry_count column (default 0)
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS retry_count  INTEGER NOT NULL DEFAULT 0;

-- Add next_retry_at column (nullable; set when a retry is scheduled)
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add DEAD_LETTER to the status check constraint
-- Drop the old constraint if it exists, then re-create with the new value
ALTER TABLE webhook_events
  DROP CONSTRAINT IF EXISTS webhook_events_status_check;

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_status_check
  CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER'));

-- Index for the cron job to find events ready for retry
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
  ON webhook_events (status, retry_count, next_retry_at)
  WHERE status = 'FAILED' AND retry_count < 3;

-- Comment
COMMENT ON COLUMN webhook_events.retry_count IS 'Number of retry attempts. After 3 failures, event moves to DEAD_LETTER.';
COMMENT ON COLUMN webhook_events.next_retry_at IS 'Scheduled time for next retry. Uses exponential backoff: 1min, 5min, 15min.';