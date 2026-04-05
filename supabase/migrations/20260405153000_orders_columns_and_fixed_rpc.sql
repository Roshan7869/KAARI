-- ===================================================================
-- Add Missing Columns to Orders Table
-- ===================================================================
-- These columns are needed for the checkout flow but were missing
-- from the initial schema.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method       TEXT,
  ADD COLUMN IF NOT EXISTS shipping_provider    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_provider_label TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address     JSONB,
  ADD COLUMN IF NOT EXISTS order_number_seq     BIGINT GENERATED ALWAYS AS IDENTITY;

-- Index for faster order lookups by payment method
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
  ON public.orders (payment_method)
  WHERE payment_method IS NOT NULL;

-- Index for courier/shipping provider analytics
CREATE INDEX IF NOT EXISTS idx_orders_shipping_provider
  ON public.orders (shipping_provider)
  WHERE shipping_provider IS NOT NULL;

-- ===================================================================
-- Fix / Recreate Atomic Order Creation RPC
-- ===================================================================
-- Corrects column names to match actual schema:
--   - 'status' (not 'order_status')
--   - no 'payment_method' initially → now added above
-- Also removes payment_session creation (handled by /api/payments/cashfree/create-order)

DROP FUNCTION IF EXISTS create_order_from_checkout CASCADE;

CREATE OR REPLACE FUNCTION create_order_from_checkout(
  p_cart_id                 UUID,
  p_user_id                 UUID,
  p_payment_method          TEXT,   -- 'online' or 'cod'
  p_shipping_address        JSONB,
  p_tax_amount              NUMERIC DEFAULT 0,
  p_shipping_amount         NUMERIC DEFAULT 0,
  p_shipping_provider       TEXT    DEFAULT 'INDIA_POST',
  p_shipping_provider_label TEXT    DEFAULT NULL,
  p_checkout_session_id     UUID    DEFAULT NULL
)
RETURNS TABLE (
  success         BOOLEAN,
  order_id        UUID,
  order_number    TEXT,
  error_message   TEXT
) AS $$
DECLARE
  v_order_id              UUID;
  v_order_number          TEXT;
  v_cart_total            NUMERIC;
  v_item_count            INT := 0;
  v_insufficient_items    TEXT[] := ARRAY[]::TEXT[];
  v_cart_item             RECORD;
BEGIN
  -- ── STEP 1: Check cart hasn't been converted already ──────────────
  PERFORM 1 FROM carts
  WHERE id = p_cart_id AND status = 'active' AND converted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT,
      'Cart is not active or has already been used for a previous order.';
    RETURN;
  END IF;

  -- ── STEP 2: Calculate cart total ──────────────────────────────────
  SELECT COALESCE(SUM(ci.line_total), 0)
  INTO v_cart_total
  FROM cart_items ci
  WHERE ci.cart_id = p_cart_id;

  IF v_cart_total <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Cart is empty or has invalid total';
    RETURN;
  END IF;

  -- ── STEP 3: Lock variants + validate stock ─────────────────────────
  -- Row-level FOR UPDATE lock prevents concurrent purchases of same variant
  -- ORDER BY ensures consistent lock order (deadlock prevention)
  FOR v_cart_item IN
    SELECT
      ci.product_id,
      ci.variant_id,
      ci.quantity,
      p.title,
      p.allow_customization,
      p.is_active,
      COALESCE(pv.stock_qty, 0) AS stock_qty
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_variants pv
      ON pv.id = COALESCE(ci.variant_id, p.default_variant_id)
    WHERE ci.cart_id = p_cart_id
    ORDER BY COALESCE(pv.id::TEXT, ci.product_id::TEXT)
    FOR UPDATE OF pv SKIP LOCKED
  LOOP
    v_item_count := v_item_count + 1;

    IF NOT v_cart_item.is_active THEN
      v_insufficient_items := array_append(v_insufficient_items,
        v_cart_item.title || ': no longer available');
      CONTINUE;
    END IF;

    -- Only check stock for standard (non-customized) items
    IF NOT COALESCE(v_cart_item.allow_customization, false) THEN
      IF v_cart_item.stock_qty < v_cart_item.quantity THEN
        v_insufficient_items := array_append(v_insufficient_items,
          v_cart_item.title ||
          ' (in stock: ' || v_cart_item.stock_qty::TEXT ||
          ', requested: ' || v_cart_item.quantity::TEXT || ')');
      END IF;
    END IF;
  END LOOP;

  IF v_item_count = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'No items in cart';
    RETURN;
  END IF;

  IF array_length(v_insufficient_items, 1) > 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT,
      'Insufficient stock: ' || array_to_string(v_insufficient_items, '; ');
    RETURN;
  END IF;

  -- ── STEP 4: Generate unique order number ───────────────────────────
  v_order_number := 'KH-' ||
    to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));

  -- ── STEP 5: Create order ───────────────────────────────────────────
  INSERT INTO public.orders (
    user_id,
    checkout_session_id,
    order_number,
    status,
    payment_status,
    payment_method,
    fulfillment_type,
    subtotal,
    shipping_amount,
    tax_amount,
    total_amount,
    shipping_provider,
    shipping_provider_label,
    shipping_address
  ) VALUES (
    p_user_id,
    p_checkout_session_id,
    v_order_number,
    CASE WHEN p_payment_method = 'cod' THEN 'placed' ELSE 'payment_pending' END,
    CASE WHEN p_payment_method = 'cod' THEN 'pending' ELSE 'initiated' END,
    p_payment_method,
    (
      SELECT CASE WHEN bool_or(p.allow_customization) THEN 'customized' ELSE 'standard' END
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = p_cart_id
    ),
    v_cart_total,
    COALESCE(p_shipping_amount, 0),
    COALESCE(p_tax_amount, 0),
    v_cart_total + COALESCE(p_shipping_amount, 0) + COALESCE(p_tax_amount, 0),
    p_shipping_provider,
    p_shipping_provider_label,
    p_shipping_address
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- ── STEP 6: Create order items + reduce stock atomically ───────────
  INSERT INTO public.order_items (
    order_id, product_id, variant_id, quantity, unit_price, line_total
  )
  SELECT
    v_order_id,
    ci.product_id,
    ci.variant_id,
    ci.quantity,
    ci.unit_price,
    ci.line_total
  FROM cart_items ci
  WHERE ci.cart_id = p_cart_id;

  -- Reduce stock only for non-customized items with known variants
  UPDATE product_variants pv
  SET    stock_qty = GREATEST(0, stock_qty - sub.total_qty)
  FROM (
    SELECT
      COALESCE(ci.variant_id, p.default_variant_id) AS vid,
      SUM(ci.quantity) AS total_qty
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = p_cart_id
      AND NOT COALESCE(p.allow_customization, false)
    GROUP BY 1
  ) sub
  WHERE pv.id = sub.vid;

  -- ── STEP 7: Mark cart as converted (idempotency) ───────────────────
  UPDATE carts
  SET
    status       = 'converted',
    converted_at = now(),
    updated_at   = now()
  WHERE id          = p_cart_id
    AND converted_at IS NULL;   -- Prevents double-convert race condition

  IF NOT FOUND THEN
    -- Cart was concurrently converted — rollback happens automatically
    RETURN QUERY SELECT false, v_order_id, v_order_number,
      'Cart was already converted (duplicate checkout detected)';
    RETURN;
  END IF;

  -- ── SUCCESS ────────────────────────────────────────────────────────
  RETURN QUERY SELECT true, v_order_id, v_order_number, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT,
    'Unexpected error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Grant to authenticated users only
REVOKE ALL ON FUNCTION create_order_from_checkout(UUID,UUID,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_from_checkout(UUID,UUID,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,TEXT,UUID)
  TO authenticated;
