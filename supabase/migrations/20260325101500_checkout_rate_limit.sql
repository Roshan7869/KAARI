-- Server-side rate limiting for checkout/order creation

CREATE TABLE IF NOT EXISTS public.rate_limit_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, identifier)
);

ALTER TABLE public.rate_limit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope text,
  p_identifier text,
  p_max_attempts int,
  p_window_seconds int,
  p_block_seconds int
)
RETURNS TABLE(
  allowed boolean,
  remaining int,
  retry_after_seconds int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_state public.rate_limit_state%ROWTYPE;
  v_window interval := make_interval(secs => p_window_seconds);
  v_block interval := make_interval(secs => p_block_seconds);
BEGIN
  IF p_scope IS NULL OR p_identifier IS NULL THEN
    RAISE EXCEPTION 'Rate limit scope and identifier are required';
  END IF;

  INSERT INTO public.rate_limit_state (scope, identifier, window_start, request_count)
  VALUES (p_scope, p_identifier, v_now, 0)
  ON CONFLICT (scope, identifier) DO NOTHING;

  SELECT *
  INTO v_state
  FROM public.rate_limit_state
  WHERE scope = p_scope
    AND identifier = p_identifier
  FOR UPDATE;

  IF v_state.blocked_until IS NOT NULL AND v_state.blocked_until > v_now THEN
    RETURN QUERY
    SELECT
      false,
      0,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_state.blocked_until - v_now)))::int);
    RETURN;
  END IF;

  IF v_state.window_start + v_window <= v_now THEN
    UPDATE public.rate_limit_state
    SET window_start = v_now,
        request_count = 1,
        blocked_until = NULL,
        updated_at = v_now
    WHERE id = v_state.id;

    RETURN QUERY SELECT true, GREATEST(0, p_max_attempts - 1), 0;
    RETURN;
  END IF;

  IF v_state.request_count + 1 > p_max_attempts THEN
    UPDATE public.rate_limit_state
    SET request_count = v_state.request_count + 1,
        blocked_until = v_now + v_block,
        updated_at = v_now
    WHERE id = v_state.id;

    RETURN QUERY SELECT false, 0, p_block_seconds;
    RETURN;
  END IF;

  UPDATE public.rate_limit_state
  SET request_count = v_state.request_count + 1,
      updated_at = v_now
  WHERE id = v_state.id;

  RETURN QUERY
  SELECT true, GREATEST(0, p_max_attempts - (v_state.request_count + 1)), 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_from_cart_limited(
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
  v_allowed boolean;
  v_retry_after int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in to continue checkout.';
  END IF;

  SELECT allowed, retry_after_seconds
  INTO v_allowed, v_retry_after
  FROM public.check_rate_limit(
    'checkout:create_order',
    v_user_id::text,
    8,
    900,
    1800
  );

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Too many checkout attempts. Please try again in % seconds.', v_retry_after;
  END IF;

  RETURN public.create_order_from_cart(
    p_cart_id,
    p_payment_method,
    p_email,
    p_phone,
    p_shipping_name,
    p_shipping_line1,
    p_shipping_line2,
    p_city,
    p_state,
    p_postal_code,
    p_country
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, int, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, int, int) TO authenticated;

REVOKE ALL ON FUNCTION public.create_order_from_cart_limited(
  uuid, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart_limited(
  uuid, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_order_from_cart(
  uuid, text, text, text, text, text, text, text, text, text, text
) FROM authenticated;
