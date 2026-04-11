-- ===================================================================
-- Site Settings Table: Admin-Configurable Store Settings
-- ===================================================================
-- Stores key-value pairs for admin-configurable settings like
-- free shipping threshold, base shipping cost, etc.

CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default shipping configuration
INSERT INTO site_settings (key, value)
VALUES ('free_shipping', '{"threshold": 999, "enabled": true, "base_cost": 79}')
ON CONFLICT (key) DO NOTHING;

-- RLS: Only service role can modify; public read is intentional for shipping display
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin client bypasses RLS, but policy for safety)
DROP POLICY IF EXISTS "site_settings_service_all" ON site_settings;
CREATE POLICY "site_settings_service_all"
  ON site_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon/authenticated can read (needed for shipping cost display)
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings (key);
