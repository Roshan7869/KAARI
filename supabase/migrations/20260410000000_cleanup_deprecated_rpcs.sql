-- =====================================================================
-- Cleanup: Remove deprecated RPC functions left over from earlier phases
-- =====================================================================
-- Issue 1: create_order_from_cart (v1 - basic, race-prone)
--   Created in: 20260314101500_seed_catalog_and_stock_checkout_rpc.sql
--   Replaced by: create_order_from_checkout in 20260405152000 + 20260405153000
--
-- Issue 2: create_order_from_cart_limited (v2 - rate-limit wrapper)
--   Created in: 20260325101500_checkout_rate_limit.sql
--   Replaced by: create_order_from_checkout (atomic, row-locked version)
--
-- Issue 3: Clarify payment_sessions vs cashfree_sessions
--   Both tables exist legitimately with distinct roles:
--     cashfree_sessions  → Cashfree SDK session state (provider-specific)
--     payment_sessions   → Generic app-level payment session (order-linked)
--   Already separated in schema — just add comments for clarity.
-- =====================================================================

-- Drop old v1 order RPC (all overloads)
DROP FUNCTION IF EXISTS public.create_order_from_cart(
  uuid, text, text, text, text, text, text, text, text, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart(
  uuid, text, text, text, text, text, text, text, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart CASCADE;

-- Drop old v2 rate-limited wrapper (all overloads)
DROP FUNCTION IF EXISTS public.create_order_from_cart_limited(
  uuid, text, text, text, text, text, text, text, text, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart_limited(
  uuid, text, text, text, text, text, text, text, text, text
) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart_limited(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_order_from_cart_limited CASCADE;

-- ── Table comments for clarity ──────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_sessions'
  ) THEN
    EXECUTE $q$
      COMMENT ON TABLE public.payment_sessions IS
        'App-level payment sessions. Tracks order payment lifecycle (pending → paid/failed/expired). '
        'Generic: works with any payment provider. Created by /api/checkout, read by /api/payments/*.'
    $q$;
  END IF;
END $$;

-- cashfree_sessions comment (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cashfree_sessions'
  ) THEN
    EXECUTE $q$
      COMMENT ON TABLE public.cashfree_sessions IS
        'Cashfree-specific session state. Stores payment_session_id from Cashfree SDK, '
        'cf_order_id mapping, and raw SDK response. Linked to payment_sessions by order_id.'
    $q$;
  END IF;
END $$;

-- =====================================================================
-- Verify: current canonical order creation function
-- =====================================================================
-- The ONLY function that should be called to create orders is:
--   public.create_order_from_checkout(p_cart_id, p_user_id, p_payment_method, ...)
-- Invoked from: /api/checkout (POST)
-- =====================================================================
