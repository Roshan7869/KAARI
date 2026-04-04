-- 20260402000000_add_shipping_provider.sql
-- Adds courier selection + shipment tracking fields to the orders table.
-- Run: npx supabase db push  (or npx supabase migration up for hosted Supabase)

-- ── Shipping provider & label ──────────────────────────────────────────────
alter table orders
  add column if not exists shipping_provider       text not null default 'INDIA_POST',
  add column if not exists shipping_provider_label text,
  add column if not exists shipping_tracking_id    text,
  add column if not exists shipping_tracking_url   text;

-- Allowed provider keys (matches COURIER_OPTIONS in Checkout.tsx)
alter table orders
  drop constraint if exists valid_shipping_provider;

alter table orders
  add constraint valid_shipping_provider
  check (shipping_provider in ('INDIA_POST', 'TIRUPATI_BALAJI', 'DTDC', 'OTHER'));

-- Require label when provider = OTHER
alter table orders
  drop constraint if exists shipping_provider_label_required;

alter table orders
  add constraint shipping_provider_label_required
  check (
    shipping_provider != 'OTHER'
    or (shipping_provider = 'OTHER' and shipping_provider_label is not null and shipping_provider_label != '')
  );

-- Index for admin → filter / group by provider
create index if not exists idx_orders_shipping_provider
  on orders (shipping_provider);

-- Handy comments
comment on column orders.shipping_provider       is 'Courier key selected by customer at checkout (INDIA_POST | TIRUPATI_BALAJI | DTDC | OTHER)';
comment on column orders.shipping_provider_label is 'Human-readable courier name — required when shipping_provider = OTHER';
comment on column orders.shipping_tracking_id    is 'Tracking number entered by admin after dispatch';
comment on column orders.shipping_tracking_url   is 'Optional deep-link to courier tracking page';
