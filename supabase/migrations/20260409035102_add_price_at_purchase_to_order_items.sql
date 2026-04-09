-- Add price_at_purchase column to order_items table to capture snapshot of product prices at time of purchase
-- This ensures accurate historical pricing even if product prices change later

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10,2);

-- Populate existing records with current unit_price as price_at_purchase
-- This preserves the historical pricing for existing orders
UPDATE public.order_items
SET price_at_purchase = unit_price
WHERE price_at_purchase IS NULL;

-- Update the order creation RPC to save current prices as price_at_purchase
-- The RPC function already captures unit_price from cart_items, so we just need to save it
-- This change needs to be made in the application code that creates order items