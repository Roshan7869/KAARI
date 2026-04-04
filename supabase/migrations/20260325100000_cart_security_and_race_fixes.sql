-- Cart security + race condition hardening
-- 1) Prevent duplicate active carts per user
-- 2) Prevent duplicate standard cart rows for same variant
-- 3) Force server-side unit pricing + stock checks for cart writes
-- 4) Add atomic RPCs for add/update quantity operations

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_one_active_per_user
ON public.carts(user_id)
WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_standard_variant
ON public.cart_items(cart_id, product_id, variant_id, item_type)
WHERE item_type = 'standard' AND variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_cart_item_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_id uuid;
  v_stock_qty int;
  v_variant_price numeric(10,2);
  v_base_price numeric(10,2);
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF NEW.variant_id IS NOT NULL THEN
    SELECT pv.id, pv.stock_qty, pv.price, p.base_price
    INTO v_variant_id, v_stock_qty, v_variant_price, v_base_price
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = NEW.variant_id
      AND pv.product_id = NEW.product_id
    FOR UPDATE;
  ELSE
    SELECT pv.id, pv.stock_qty, pv.price, p.base_price
    INTO v_variant_id, v_stock_qty, v_variant_price, v_base_price
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.product_id = NEW.product_id
    ORDER BY pv.is_default DESC, pv.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'Stock variant missing for product %', NEW.product_id;
  END IF;

  IF COALESCE(v_stock_qty, 0) < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Requested %, available %', NEW.quantity, COALESCE(v_stock_qty, 0);
  END IF;

  NEW.variant_id := v_variant_id;
  NEW.unit_price := COALESCE(v_variant_price, v_base_price);
  NEW.line_total := NEW.unit_price * NEW.quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_normalize_cart_item_pricing ON public.cart_items;
CREATE TRIGGER tr_normalize_cart_item_pricing
BEFORE INSERT OR UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_cart_item_pricing();

CREATE OR REPLACE FUNCTION public.add_item_to_cart(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity int DEFAULT 1,
  p_item_type text DEFAULT 'standard'
)
RETURNS TABLE (
  cart_item_id uuid,
  quantity int,
  unit_price numeric,
  line_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_variant_id uuid;
  v_stock_qty int;
  v_existing public.cart_items%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_item_type <> 'standard' THEN
    RAISE EXCEPTION 'RPC add_item_to_cart only supports standard item type';
  END IF;

  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF v_cart_id IS NULL THEN
    BEGIN
      INSERT INTO public.carts(user_id, status, currency)
      VALUES (v_user_id, 'active', 'INR')
      RETURNING id INTO v_cart_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT id INTO v_cart_id
        FROM public.carts
        WHERE user_id = v_user_id
          AND status = 'active'
        FOR UPDATE;
    END;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT id, stock_qty
    INTO v_variant_id, v_stock_qty
    FROM public.product_variants
    WHERE id = p_variant_id
      AND product_id = p_product_id
    FOR UPDATE;
  ELSE
    SELECT id, stock_qty
    INTO v_variant_id, v_stock_qty
    FROM public.product_variants
    WHERE product_id = p_product_id
    ORDER BY is_default DESC, id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_variant_id IS NULL THEN
    RAISE EXCEPTION 'Stock variant missing for this product';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.cart_items
  WHERE cart_id = v_cart_id
    AND product_id = p_product_id
    AND variant_id = v_variant_id
    AND item_type = 'standard'
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.quantity + p_quantity > COALESCE(v_stock_qty, 0) THEN
      RAISE EXCEPTION 'Only % item(s) left in stock', COALESCE(v_stock_qty, 0);
    END IF;

    UPDATE public.cart_items
    SET quantity = v_existing.quantity + p_quantity
    WHERE id = v_existing.id
    RETURNING id, cart_items.quantity, cart_items.unit_price, cart_items.line_total
    INTO cart_item_id, quantity, unit_price, line_total;
  ELSE
    IF p_quantity > COALESCE(v_stock_qty, 0) THEN
      RAISE EXCEPTION 'Only % item(s) left in stock', COALESCE(v_stock_qty, 0);
    END IF;

    INSERT INTO public.cart_items (
      cart_id, product_id, variant_id, quantity, unit_price, line_total, item_type
    )
    VALUES (
      v_cart_id, p_product_id, v_variant_id, p_quantity, 0, 0, 'standard'
    )
    RETURNING id, cart_items.quantity, cart_items.unit_price, cart_items.line_total
    INTO cart_item_id, quantity, unit_price, line_total;
  END IF;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_cart_item_quantity(
  p_cart_item_id uuid,
  p_quantity int
)
RETURNS TABLE (
  cart_item_id uuid,
  quantity int,
  unit_price numeric,
  line_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_item public.cart_items%ROWTYPE;
  v_stock_qty int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT ci.*
  INTO v_cart_item
  FROM public.cart_items ci
  JOIN public.carts c ON c.id = ci.cart_id
  WHERE ci.id = p_cart_item_id
    AND c.user_id = v_user_id
    AND c.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item not found';
  END IF;

  SELECT stock_qty
  INTO v_stock_qty
  FROM public.product_variants
  WHERE id = v_cart_item.variant_id
  FOR UPDATE;

  IF COALESCE(v_stock_qty, 0) < p_quantity THEN
    RAISE EXCEPTION 'Only % item(s) left in stock', COALESCE(v_stock_qty, 0);
  END IF;

  UPDATE public.cart_items
  SET quantity = p_quantity
  WHERE id = v_cart_item.id
  RETURNING id, cart_items.quantity, cart_items.unit_price, cart_items.line_total
  INTO cart_item_id, quantity, unit_price, line_total;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.add_item_to_cart(uuid, uuid, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_item_to_cart(uuid, uuid, int, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_cart_item_quantity(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_cart_item_quantity(uuid, int) TO authenticated;
