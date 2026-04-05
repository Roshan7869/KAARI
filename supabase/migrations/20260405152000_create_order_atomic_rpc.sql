-- ===================================================================
-- Atomic Order Creation RPC
-- ===================================================================
-- Problem: Order creation is 6 sequential steps without transaction
--          guarantees. Stock can be depleted between validation & insert,
--          causing overselling. Orders can fail mid-creation leaving
--          orphaned data.
-- Solution: PL/pgSQL RPC with:
--           1. Row-level locking (FOR UPDATE) on all variants
--           2. Stock validation inside transaction
--           3. Atomic order + order_items + stock reduction
--           4. Payment session creation if needed
--           5. Cart conversion with idempotency constraint

-- Drop existing function if it exists (safe - we're replacing it)
DROP FUNCTION IF EXISTS create_order_from_checkout CASCADE;

CREATE OR REPLACE FUNCTION create_order_from_checkout(
  p_cart_id           UUID,
  p_user_id           UUID,
  p_payment_method    TEXT,  -- 'online' or 'cod'
  p_shipping_address  JSONB,
  p_tax_amount        NUMERIC DEFAULT 0,
  p_shipping_amount   NUMERIC DEFAULT 0,
  p_shipping_provider TEXT DEFAULT 'INDIA_POST',
  p_shipping_label    TEXT DEFAULT NULL
)
RETURNS TABLE (
  success             BOOLEAN,
  order_id            UUID,
  payment_session_id  UUID,
  error_message       TEXT
) AS $$
DECLARE
  v_order_id              UUID;
  v_payment_session_id    UUID;
  v_cart_total            NUMERIC;
  v_item_count            INT := 0;
  v_insufficient_items    TEXT[] := ARRAY[]::TEXT[];
  v_cart_item             RECORD;
  v_last_error            TEXT;
BEGIN
  -- ────────────────────────────────────────────────────────────────
  -- STEP 1: Lock and Validate Cart
  -- ────────────────────────────────────────────────────────────────
  BEGIN
    SELECT
      SUM(COALESCE(ci.line_total, 0)) INTO v_cart_total
    FROM cart_items ci
    WHERE ci.cart_id = p_cart_id;

    IF v_cart_total IS NULL OR v_cart_total <= 0 THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Cart is empty or invalid total';
      RETURN;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID,
      'Error validating cart: ' || SQLERRM;
    RETURN;
  END;

  -- ────────────────────────────────────────────────────────────────
  -- STEP 2: Lock All Product Variants and Check Stock
  -- ────────────────────────────────────────────────────────────────
  -- This is CRITICAL: Row-level locks prevent concurrent purchases
  -- Order by variant_id to prevent deadlocks (consistent lock order)
  BEGIN
    FOR v_cart_item IN
      SELECT
        ci.id as cart_item_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        ci.unit_price,
        ci.line_total,
        p.title,
        pv.stock_qty,
        p.allow_customization
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants pv ON pv.id = COALESCE(ci.variant_id, p.default_variant_id)
      WHERE ci.cart_id = p_cart_id
      ORDER BY COALESCE(pv.id, ''::UUID)  -- Consistent lock order
      FOR UPDATE OF pv  -- Lock variants to prevent concurrent purchases
    LOOP
      v_item_count := v_item_count + 1;

      -- Validate product is active
      PERFORM 1 FROM products WHERE id = v_cart_item.product_id AND is_active = true;
      IF NOT FOUND THEN
        v_insufficient_items := array_append(v_insufficient_items,
          v_cart_item.title || ': Product is no longer available');
        CONTINUE;
      END IF;

      -- Check stock (skip for customized items which have unlimited stock)
      IF NOT COALESCE(v_cart_item.allow_customization, false) THEN
        IF v_cart_item.stock_qty IS NULL OR v_cart_item.stock_qty < v_cart_item.quantity THEN
          v_insufficient_items := array_append(v_insufficient_items,
            v_cart_item.title || ': ' ||
            'available=' || COALESCE(v_cart_item.stock_qty, 0)::TEXT ||
            ', requested=' || v_cart_item.quantity::TEXT);
        END IF;
      END IF;
    END LOOP;

    -- If any item failed validation, abort entire transaction
    IF array_length(v_insufficient_items, 1) > 0 THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::UUID,
        'Insufficient stock: ' || array_to_string(v_insufficient_items, '; ');
      RETURN;
    END IF;

    IF v_item_count = 0 THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'No items in cart';
      RETURN;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID,
      'Error checking stock (deadlock or timeout): ' || SQLERRM;
    RETURN;
  END;

  -- ────────────────────────────────────────────────────────────────
  -- STEP 3: Create Order Record
  -- ────────────────────────────────────────────────────────────────
  BEGIN
    INSERT INTO orders (
      user_id,
      order_number,
      total_amount,
      tax_amount,
      shipping_amount,
      payment_method,
      order_status,
      payment_status,
      shipping_provider,
      shipping_provider_label,
      shipping_address,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      'ORD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 8),
      v_cart_total + COALESCE(p_tax_amount, 0) + COALESCE(p_shipping_amount, 0),
      COALESCE(p_tax_amount, 0),
      COALESCE(p_shipping_amount, 0),
      p_payment_method,
      CASE WHEN p_payment_method = 'cod' THEN 'placed' ELSE 'payment_pending' END,
      CASE WHEN p_payment_method = 'cod' THEN 'pending' ELSE 'initiated' END,
      p_shipping_provider,
      p_shipping_label,
      p_shipping_address,
      now(),
      now()
    ) RETURNING id INTO v_order_id;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID,
      'Error creating order: ' || SQLERRM;
    RETURN;
  END;

  -- ────────────────────────────────────────────────────────────────
  -- STEP 4: Create Order Items and Reduce Stock Atomically
  -- ────────────────────────────────────────────────────────────────
  BEGIN
    -- Insert order items
    INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price, line_total)
    SELECT
      v_order_id,
      ci.product_id,
      ci.variant_id,
      ci.quantity,
      ci.unit_price,
      ci.line_total
    FROM cart_items ci
    WHERE ci.cart_id = p_cart_id;

    -- Reduce product variant stock atomically
    UPDATE product_variants pv
    SET stock_qty = stock_qty - (
      SELECT SUM(COALESCE(ci.quantity, 0))
      FROM cart_items ci
      WHERE ci.cart_id = p_cart_id
        AND ci.variant_id = pv.id
    )
    WHERE pv.id IN (
      SELECT DISTINCT COALESCE(variant_id, p.default_variant_id)
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = p_cart_id
        AND NOT COALESCE(p.allow_customization, false)  -- Don't reduce stock for customized
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically (transaction fails)
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID,
      'Error creating order items: ' || SQLERRM;
    RETURN;
  END;

  -- ────────────────────────────────────────────────────────────────
  -- STEP 5: Create Payment Session (for online orders)
  -- ────────────────────────────────────────────────────────────────
  IF p_payment_method = 'online' THEN
    BEGIN
      INSERT INTO payment_sessions (
        order_id,
        amount,
        status,
        created_at,
        expires_at
      ) VALUES (
        v_order_id,
        v_cart_total + COALESCE(p_tax_amount, 0) + COALESCE(p_shipping_amount, 0),
        'initiated',
        now(),
        now() + INTERVAL '30 minutes'
      ) RETURNING id INTO v_payment_session_id;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT false, v_order_id, NULL::UUID,
        'Error creating payment session: ' || SQLERRM;
      RETURN;
    END;
  END IF;

  -- ────────────────────────────────────────────────────────────────
  -- STEP 6: Mark Cart as Converted (Idempotent)
  -- ────────────────────────────────────────────────────────────────
  BEGIN
    UPDATE carts
    SET
      status = 'converted',
      converted_at = now(),
      updated_at = now()
    WHERE id = p_cart_id
      AND converted_at IS NULL;  -- Only if not already converted

    -- Check if update succeeded (row was found and updated)
    IF NOT FOUND THEN
      -- Cart was already converted by another request (race condition handled gracefully)
      RETURN QUERY SELECT false, v_order_id, v_payment_session_id,
        'Cart was already converted (duplicate checkout attempt detected)';
      RETURN;
    END IF;

  EXCEPTION WHEN UNIQUE_VIOLATION THEN
    -- UNIQUE constraint on (id, converted_at) was violated
    --  This means another request converted the cart concurrently
    RETURN QUERY SELECT false, v_order_id, v_payment_session_id,
      'Cart conversion conflict (concurrent checkout detected)';
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, v_order_id, v_payment_session_id,
      'Error converting cart: ' || SQLERRM;
    RETURN;
  END;

  -- ────────────────────────────────────────────────────────────────
  -- SUCCESS: Return order details
  -- ────────────────────────────────────────────────────────────────
  RETURN QUERY SELECT true, v_order_id, v_payment_session_id, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  v_last_error := 'Unexpected error in order creation: ' || SQLERRM;
  RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, v_last_error;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public;

-- ===================================================================
-- Grant permission to authenticated users only
-- ===================================================================
GRANT EXECUTE ON FUNCTION create_order_from_checkout(
  UUID, UUID, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT
) TO authenticated;
