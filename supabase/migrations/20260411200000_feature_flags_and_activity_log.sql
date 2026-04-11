-- ============================================================
-- Feature Flags + Admin Activity Log
-- Gives admin 100% live control over every user-facing feature
-- ============================================================

-- ── 1. Feature Flags ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key     text UNIQUE NOT NULL,
  flag_label   text NOT NULL,
  flag_group   text NOT NULL,  -- 'homepage' | 'products' | 'checkout' | 'navigation' | 'storefront'
  is_enabled   boolean NOT NULL DEFAULT true,
  config       jsonb NOT NULL DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_on  timestamptz DEFAULT NULL,
  scheduled_off timestamptz DEFAULT NULL
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admins can write, everyone can read (needed client-side by useFeatureFlag hook)
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "feature_flags_public_read" ON public.feature_flags
  FOR SELECT USING (true);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_key
  ON public.feature_flags(flag_key);

CREATE INDEX IF NOT EXISTS idx_feature_flags_group
  ON public.feature_flags(flag_group);

-- Seed all controllable features
INSERT INTO public.feature_flags (flag_key, flag_label, flag_group, is_enabled) VALUES
  -- Homepage
  ('homepage_announcement_bar', 'Show Announcement Bar',               'homepage',    true),
  ('homepage_banner_slideshow',  'Show Hero Banner Slideshow',         'homepage',    true),
  ('homepage_featured_products', 'Show Featured Products Section',     'homepage',    true),
  ('homepage_artisan_story',     'Show Artisan Story Section',         'homepage',    true),
  -- Navigation
  ('nav_category_strip',         'Show Category Navigation Strip',     'navigation',  true),
  -- Products page
  ('products_filter_drawer',     'Enable Filter Drawer',               'products',    true),
  ('products_search_bar',        'Show Search Bar on Products Page',   'products',    false),
  ('products_list_view_toggle',  'Allow List / Grid View Toggle',      'products',    true),
  -- Product detail page
  ('product_reviews_section',    'Show Product Reviews Section',       'products',    true),
  ('product_wishlist_button',    'Show Wishlist / Save Button',        'products',    true),
  ('product_share_button',       'Show Share Button',                  'products',    true),
  ('product_whatsapp_banner',    'Show WhatsApp CTA Banner',           'products',    true),
  ('product_trust_badges',       'Show Trust Badges Strip',            'products',    true),
  ('product_related_section',    'Show "You May Also Love" Section',   'products',    true),
  ('product_size_selector',      'Allow Size Selector on Products',    'products',    true),
  ('product_color_selector',     'Allow Color Selector on Products',   'products',    true),
  ('product_low_stock_badge',    'Show "Low Stock" Warning Badge',     'products',    true),
  -- Checkout
  ('checkout_coupon_input',      'Show Coupon Code Field',             'checkout',    true),
  ('checkout_guest_mode',        'Allow Guest Checkout',               'checkout',    false),
  ('checkout_upi_only',          'UPI-Only Payment Mode',              'checkout',    false),
  ('checkout_free_ship_banner',  'Show Free Shipping Threshold Banner','checkout',    true),
  -- Storefront
  ('storefront_whatsapp_float',  'Show WhatsApp Float Button (global)','storefront',  true),
  ('storefront_sale_badge',      'Show SALE Badge Site-wide',          'storefront',  false)
ON CONFLICT (flag_key) DO NOTHING;

-- ── 2. Admin Activity Log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action       text NOT NULL,       -- e.g. 'PRODUCT_UPDATED', 'FEATURE_TOGGLED'
  entity_type  text NOT NULL,       -- e.g. 'product', 'feature_flag', 'coupon'
  entity_id    text,
  entity_label text,                -- human-readable: product title, flag label, etc.
  before_state jsonb,
  after_state  jsonb,
  ip_address   inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the activity log
CREATE POLICY "activity_log_admin_only" ON public.admin_activity_log
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created
  ON public.admin_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity
  ON public.admin_activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin
  ON public.admin_activity_log(admin_id);
