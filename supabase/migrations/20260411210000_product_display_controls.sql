-- ============================================================
-- Product Display Controls
-- Per-product admin toggles: sizes, colors, trust badges,
-- related products, and WhatsApp CTA customization
-- ============================================================

ALTER TABLE public.products
  -- Size selector: admin can toggle per product (off by default — most crochet items have no sizes)
  ADD COLUMN IF NOT EXISTS has_size_selector  boolean NOT NULL DEFAULT false,
  -- Comma/array of available sizes. e.g. '{"XS","S","M","L","XL"}' or '{"Petite","Standard","Large"}'
  ADD COLUMN IF NOT EXISTS size_options       text[]  NOT NULL DEFAULT '{}',

  -- Color selector: admin toggle per product
  ADD COLUMN IF NOT EXISTS has_color_selector boolean NOT NULL DEFAULT false,
  -- JSON array: [{name: "Dusty Rose", hex: "#C06080"}]
  ADD COLUMN IF NOT EXISTS color_options      jsonb   NOT NULL DEFAULT '[]',

  -- Trust badges: null = use global site defaults, array = override per product
  -- Format: [{icon: "handmade"|"shipping"|"secure"|"custom", label: "...", sublabel: "..."}]
  ADD COLUMN IF NOT EXISTS trust_badges_config jsonb   DEFAULT NULL,

  -- Related products: manually curated by admin. Empty = use auto-algo (same category)
  ADD COLUMN IF NOT EXISTS related_product_ids uuid[]  NOT NULL DEFAULT '{}',

  -- Whether to show the related products section at all on this product's page
  ADD COLUMN IF NOT EXISTS show_related_products boolean NOT NULL DEFAULT true,

  -- Custom WhatsApp URL for this product (overrides global WA number)
  -- e.g. "https://wa.me/919876543210?text=Hi!+I'm+interested+in+[product]"
  ADD COLUMN IF NOT EXISTS whatsapp_cta_url   text    DEFAULT NULL,

  -- Admin note (internal — never shown to customers)
  ADD COLUMN IF NOT EXISTS admin_note         text    DEFAULT NULL,

  -- Scheduled publish: auto-set is_active=true at this time
  ADD COLUMN IF NOT EXISTS scheduled_at       timestamptz DEFAULT NULL;

-- Index for related products UUID array lookups
CREATE INDEX IF NOT EXISTS idx_products_related_ids
  ON public.products USING gin(related_product_ids)
  WHERE is_active = true;
