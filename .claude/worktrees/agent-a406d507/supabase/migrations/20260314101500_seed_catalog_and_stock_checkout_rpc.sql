-- Seed catalog products and enforce stock-aware checkout.

WITH seed_products (title, slug, category, base_price, allow_customization, description) AS (
  VALUES
    ('Boho Sunburst Handbag', 'boho-sunburst-handbag', 'Crochet Handbags', 1499, true, 'Handmade crochet handbag with sunburst design.'),
    ('Floral Crochet Tote', 'floral-tote-bag', 'Crochet Handbags', 1899, true, 'Spacious tote with floral crochet patterns.'),
    ('Orange Bloom Gajra', 'orange-bloom-gajra', 'Crochet Gajra', 399, true, 'Festival-ready crochet gajra in bright tones.'),
    ('Bridal Red Gajra', 'bridal-red-gajra', 'Crochet Gajra', 599, true, 'Elegant bridal crochet gajra.'),
    ('Pastel Bunny Doll', 'pastel-bunny-doll', 'Crochet Dolls', 799, true, 'Soft handmade amigurumi bunny doll.'),
    ('Classic Teddy Bear', 'teddy-bear-doll', 'Crochet Dolls', 999, true, 'Handcrafted crochet teddy bear.'),
    ('Unicorn Yarn Keychain', 'unicorn-keychain', 'Crochet Keychains', 249, true, 'Mini crochet unicorn keychain accessory.'),
    ('Rainbow Flower Keychain', 'rainbow-flower-keychain', 'Crochet Keychains', 199, true, 'Colorful flower keychain with crochet finish.'),
    ('Boho Crochet Scrunchie', 'boho-scrunchie', 'Crochet Accessories', 149, true, 'Soft and stretchy crochet scrunchie.')
)
INSERT INTO public.products (
  title,
  slug,
  description,
  product_type,
  base_price,
  currency,
  is_active,
  allow_customization,
  category
)
SELECT
  sp.title,
  sp.slug,
  sp.description,
  'ready_made',
  sp.base_price,
  'INR',
  true,
  sp.allow_customization,
  sp.category
FROM seed_products sp
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  allow_customization = EXCLUDED.allow_customization,
  category = EXCLUDED.category,
  updated_at = now();

WITH seeded_slugs(slug) AS (
  VALUES
    ('boho-sunburst-handbag'),
    ('floral-tote-bag'),
    ('orange-bloom-gajra'),
    ('bridal-red-gajra'),
    ('pastel-bunny-doll'),
    ('teddy-bear-doll'),
    ('unicorn-keychain'),
    ('rainbow-flower-keychain'),
    ('boho-scrunchie')
)
INSERT INTO public.product_variants (
  product_id,
  sku,
  size,
  color,
  material,
  price,
  stock_qty,
  production_days,
  is_default
)
SELECT
  p.id,
  'SKU-' || upper(replace(p.slug, '-', '_')) || '-DEFAULT',
  'Standard',
  NULL,
  'Cotton',
  p.base_price,
  20,
  7,
  true
FROM public.products p
JOIN seeded_slugs ss ON ss.slug = p.slug
ON CONFLICT (sku) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  price = EXCLUDED.price,
  stock_qty = 20,
  production_days = EXCLUDED.production_days,
  is_default = true;

UPDATE public.product_variants pv
SET stock_qty = 20
FROM public.products p
WHERE pv.product_id = p.id
  AND p.slug IN (
    'boho-sunburst-handbag',
    'floral-tote-bag',
    'orange-bloom-gajra',
    'bridal-red-gajra',
    'pastel-bunny-doll',
    'teddy-bear-doll',
    'unicorn-keychain',
    'rainbow-flower-keychain',
    'boho-scrunchie'
  );

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_cart_id uuid,
  p_payment_method text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_shipping_name text DEFAULT NULL,
  p_shipping_line1 text DEFAULT NULL,
  p_shipping_line2 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_country text DEFAULT 'IN'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart public.carts%ROWTYPE;
  v_cart_item RECORD;
  v_checkout_session_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_variant_id uuid;
  v_variant_stock int;
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_tax numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_checkout_status text;
  v_order_status text;
  v_order_payment_status text;
  v_payment_provider text := lower(coalesce(trim(p_payment_method), 'cod'));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in to continue checkout.';
  END IF;

  SELECT *
  INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id
    AND user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active cart not found.';
  END IF;

  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM public.cart_items
  WHERE cart_id = v_cart.id;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  v_shipping := CASE WHEN v_subtotal > 0 THEN 99 ELSE 0 END;
  v_tax := 0;
  v_total := v_subtotal + v_shipping + v_tax;

  FOR v_cart_item IN
    SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, p.title
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart.id
    FOR UPDATE
  LOOP
    v_variant_id := NULL;
    v_variant_stock := 0;

    IF v_cart_item.variant_id IS NOT NULL THEN
      SELECT id, stock_qty
      INTO v_variant_id, v_variant_stock
      FROM public.product_variants
      WHERE id = v_cart_item.variant_id
        AND product_id = v_cart_item.product_id
      FOR UPDATE;
    ELSE
      SELECT id, stock_qty
      INTO v_variant_id, v_variant_stock
      FROM public.product_variants
      WHERE product_id = v_cart_item.product_id
      ORDER BY is_default DESC, id
      LIMIT 1
      FOR UPDATE;
    END IF;

    IF v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Stock variant missing for product %.', v_cart_item.title;
    END IF;

    IF COALESCE(v_variant_stock, 0) < v_cart_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %. Requested %, available %.',
        v_cart_item.title, v_cart_item.quantity, COALESCE(v_variant_stock, 0);
    END IF;
  END LOOP;

  IF v_payment_provider = 'cod' THEN
    v_checkout_status := 'completed';
    v_order_status := 'placed';
    v_order_payment_status := 'pending';
  ELSE
    v_checkout_status := 'payment_pending';
    v_order_status := 'payment_pending';
    v_order_payment_status := 'initiated';
  END IF;

  INSERT INTO public.checkout_sessions (
    cart_id,
    user_id,
    email,
    phone,
    shipping_name,
    shipping_line1,
    shipping_line2,
    city,
    state,
    postal_code,
    country,
    payment_method,
    subtotal,
    shipping_amount,
    tax_amount,
    total_amount,
    status
  ) VALUES (
    v_cart.id,
    v_user_id,
    p_email,
    p_phone,
    p_shipping_name,
    p_shipping_line1,
    p_shipping_line2,
    p_city,
    p_state,
    p_postal_code,
    COALESCE(NULLIF(trim(p_country), ''), 'IN'),
    v_payment_provider,
    v_subtotal,
    v_shipping,
    v_tax,
    v_total,
    v_checkout_status
  )
  RETURNING id INTO v_checkout_session_id;

  INSERT INTO public.orders (
    user_id,
    checkout_session_id,
    status,
    payment_status,
    fulfillment_type,
    subtotal,
    shipping_amount,
    tax_amount,
    total_amount
  ) VALUES (
    v_user_id,
    v_checkout_session_id,
    v_order_status,
    v_order_payment_status,
    CASE WHEN v_payment_provider = 'cod' THEN 'standard' ELSE 'standard' END,
    v_subtotal,
    v_shipping,
    v_tax,
    v_total
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_cart_item IN
    SELECT
      ci.id,
      ci.product_id,
      ci.variant_id,
      ci.quantity,
      ci.unit_price,
      ci.line_total,
      cic.customization_message,
      cic.preferred_size,
      cic.preferred_color,
      cic.preferred_material,
      cic.delivery_deadline,
      cic.budget_min,
      cic.budget_max
    FROM public.cart_items ci
    LEFT JOIN public.cart_item_customizations cic ON cic.cart_item_id = ci.id
    WHERE ci.cart_id = v_cart.id
    FOR UPDATE
  LOOP
    v_variant_id := NULL;

    IF v_cart_item.variant_id IS NOT NULL THEN
      SELECT id INTO v_variant_id
      FROM public.product_variants
      WHERE id = v_cart_item.variant_id
        AND product_id = v_cart_item.product_id
      FOR UPDATE;
    ELSE
      SELECT id INTO v_variant_id
      FROM public.product_variants
      WHERE product_id = v_cart_item.product_id
      ORDER BY is_default DESC, id
      LIMIT 1
      FOR UPDATE;
    END IF;

    UPDATE public.product_variants
    SET stock_qty = stock_qty - v_cart_item.quantity
    WHERE id = v_variant_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      unit_price,
      line_total,
      customization_snapshot
    ) VALUES (
      v_order_id,
      v_cart_item.product_id,
      v_variant_id,
      v_cart_item.quantity,
      v_cart_item.unit_price,
      v_cart_item.line_total,
      CASE
        WHEN v_cart_item.customization_message IS NULL THEN NULL
        ELSE jsonb_build_object(
          'message', v_cart_item.customization_message,
          'preferredSize', v_cart_item.preferred_size,
          'preferredColor', v_cart_item.preferred_color,
          'preferredMaterial', v_cart_item.preferred_material,
          'deliveryDeadline', v_cart_item.delivery_deadline,
          'budgetMin', v_cart_item.budget_min,
          'budgetMax', v_cart_item.budget_max
        )
      END
    );
  END LOOP;

  INSERT INTO public.payments (
    order_id,
    provider,
    amount,
    currency,
    status
  ) VALUES (
    v_order_id,
    v_payment_provider,
    v_total,
    'INR',
    'created'
  );

  DELETE FROM public.cart_items
  WHERE cart_id = v_cart.id;

  UPDATE public.carts
  SET status = 'converted', updated_at = now()
  WHERE id = v_cart.id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'checkout_session_id', v_checkout_session_id,
    'order_number', v_order_number,
    'order_status', v_order_status,
    'payment_status', v_order_payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart(
  uuid, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_from_cart(
  uuid, text, text, text, text, text, text, text, text, text, text
) TO authenticated;
