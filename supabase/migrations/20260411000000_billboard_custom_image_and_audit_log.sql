-- ── Billboard: add custom_image_url support ──────────────────────────
ALTER TABLE billboard_products
  ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

-- ── Admin Audit Log ──────────────────────────────────────────────────
-- Tracks all admin-initiated mutations for compliance and debugging.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      TEXT NOT NULL,
  admin_email   TEXT,
  action        TEXT NOT NULL,       -- e.g. 'create', 'update', 'delete', 'upload'
  entity_type   TEXT NOT NULL,       -- e.g. 'product', 'order', 'customer', 'billboard'
  entity_id     TEXT,
  entity_label  TEXT,                -- human-readable identifier (title, name, etc.)
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries by admin, entity, or time range
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id   ON admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON admin_audit_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON admin_audit_log (created_at DESC);

-- RLS: only super-admins via service role can read/write (bypasses anon)
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON admin_audit_log
  USING (false)
  WITH CHECK (false);

-- ── Email Templates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,    -- e.g. 'order_confirmation', 'welcome'
  subject     TEXT NOT NULL,
  html_body   TEXT NOT NULL,
  text_body   TEXT,
  variables   TEXT[],                  -- list of supported template variables
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON email_templates
  USING (false)
  WITH CHECK (false);

-- Seed default email templates
INSERT INTO email_templates (name, subject, html_body, text_body, variables) VALUES
(
  'order_confirmation',
  'Order Confirmed – #{{order_number}}',
  '<h1>Thank you for your order!</h1><p>Hi {{customer_name}},</p><p>Your order <strong>#{{order_number}}</strong> has been confirmed and is being prepared with love.</p><p>Order total: <strong>₹{{total}}</strong></p><p>We will notify you once your order ships.</p><p>Warm regards,<br/>Kaari Team</p>',
  'Thank you for your order, {{customer_name}}! Your order #{{order_number}} (₹{{total}}) has been confirmed.',
  ARRAY['customer_name', 'order_number', 'total', 'items_summary', 'shipping_address']
),
(
  'order_shipped',
  'Your Order #{{order_number}} Has Shipped!',
  '<h1>Your order is on its way!</h1><p>Hi {{customer_name}},</p><p>Great news! Your Kaari order <strong>#{{order_number}}</strong> has been shipped.</p><p>Tracking ID: <strong>{{tracking_id}}</strong><br/>Provider: {{shipping_provider}}</p><p>Estimated delivery: {{estimated_delivery}}</p>',
  'Your order #{{order_number}} has shipped. Tracking ID: {{tracking_id}}',
  ARRAY['customer_name', 'order_number', 'tracking_id', 'shipping_provider', 'estimated_delivery']
),
(
  'welcome',
  'Welcome to Kaari – Handcrafted with Love',
  '<h1>Welcome to Kaari!</h1><p>Hi {{customer_name}},</p><p>We are so glad you are here. Kaari is a handmade crochet marketplace where every product is made with love.</p><p>Explore our full collection and find something beautiful.</p>',
  'Welcome to Kaari, {{customer_name}}! Explore our handmade crochet collection.',
  ARRAY['customer_name']
)
ON CONFLICT (name) DO NOTHING;
