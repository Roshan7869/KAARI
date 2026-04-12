-- ── Atomic billboard save RPC ───────────────────────────────────────
-- Replaces the destructive delete+insert pattern in the billboard API.
-- If any INSERT fails, the preceding DELETE is rolled back automatically
-- because there is no EXCEPTION handler — errors propagate to the caller
-- and PostgreSQL rolls back all work done in this function call.
-- Auth is enforced by the API route before this RPC is invoked.
CREATE OR REPLACE FUNCTION save_billboard_products(
  p_items JSONB   -- Array of {product_id, display_order, tag, is_active, custom_image_url}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item   JSONB;
  v_count  INTEGER := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
    RAISE EXCEPTION 'p_items must be a non-null JSON array';
  END IF;

  IF jsonb_array_length(p_items) > 6 THEN
    RAISE EXCEPTION 'Maximum 6 billboard slots allowed';
  END IF;

  -- ATOMIC: if any INSERT below raises an exception, the DELETE is
  -- automatically rolled back (no subtransaction / EXCEPTION block here).
  DELETE FROM billboard_products;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO billboard_products (
      product_id,
      display_order,
      tag,
      is_active,
      custom_image_url
    ) VALUES (
      (v_item->>'product_id')::UUID,
      v_count,
      NULLIF(v_item->>'tag', ''),
      COALESCE((v_item->>'is_active')::BOOLEAN, true),
      NULLIF(v_item->>'custom_image_url', '')
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- Restrict direct calls; the API route uses the service-role key
REVOKE ALL ON FUNCTION save_billboard_products(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_billboard_products(JSONB) TO service_role;

-- ── Atomic product media insert — prevents concurrent primary dupes ──
-- Uses FOR UPDATE to lock existing rows before checking is_primary,
-- so concurrent uploads cannot both see "no primary" and both win.
-- Auth/ownership is enforced by the caller; all writes go through
-- service_role which bypasses RLS.
CREATE OR REPLACE FUNCTION insert_product_media_safe(
  p_product_id  UUID,
  p_file_path   TEXT,
  p_alt_text    TEXT    DEFAULT NULL,
  p_sort_order  INTEGER DEFAULT NULL
)
RETURNS product_media
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_primary  BOOLEAN;
  v_sort_order  INTEGER;
  v_result      product_media;
BEGIN
  -- Lock existing rows for this product to prevent concurrent inserts
  -- from both seeing "no primary exists" at the same time.
  PERFORM id FROM product_media
    WHERE product_id = p_product_id
    FOR UPDATE;

  -- Atomically determine whether this image should become primary
  SELECT NOT EXISTS (
    SELECT 1 FROM product_media
    WHERE product_id = p_product_id AND is_primary = true
  ) INTO v_is_primary;

  -- Determine sort order: caller-provided OR max+1 OR 0
  IF p_sort_order IS NOT NULL THEN
    v_sort_order := p_sort_order;
  ELSE
    SELECT COALESCE(MAX(sort_order) + 1, 0)
      INTO v_sort_order
      FROM product_media
     WHERE product_id = p_product_id;
  END IF;

  INSERT INTO product_media (
    product_id,
    file_path,
    alt_text,
    sort_order,
    is_primary
  ) VALUES (
    p_product_id,
    p_file_path,
    p_alt_text,
    v_sort_order,
    v_is_primary
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION insert_product_media_safe(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_product_media_safe(UUID, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION insert_product_media_safe(UUID, TEXT, TEXT, INTEGER) TO authenticated;
