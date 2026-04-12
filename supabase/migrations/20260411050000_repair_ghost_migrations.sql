-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260411050000_repair_ghost_migrations.sql
-- Purpose:   Repair schema drift — add columns/tables that were recorded as
--            applied in supabase_migrations history but never actually created
--            (ghost migrations caused by RLS policy errors and other failures).
-- Strategy:  100% idempotent — every statement uses IF NOT EXISTS or guards.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: products table — missing columns from ghost migration 20260328120000
-- (product_reviews migration added these to products but failed on remote)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT NULL
    CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00)),
  ADD COLUMN IF NOT EXISTS review_count   INTEGER NOT NULL DEFAULT 0
    CHECK (review_count >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: orders table — missing column from ghost migration 20260409070000
-- (add_orders_expires_at_column migration applied in history but failed)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_expires_at
  ON public.orders (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: cashfree_sessions table — missing from ghost migration 20260321000000
-- (phase2_notifications_payments migration failed on remote — table was never created)
-- Full schema including user_id column required by migration 20260412000000.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cashfree_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  checkout_session_id   uuid        REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  user_id               uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Cashfree specific fields
  cf_order_id           text,
  cf_payment_session_id text        UNIQUE,
  cf_payment_id         text,

  -- Payment details
  amount                numeric(12,2) NOT NULL,
  currency              text          DEFAULT 'INR',
  payment_method        text,

  -- Status tracking
  status text DEFAULT 'created' CHECK (status IN (
    'created', 'active', 'paid', 'failed', 'cancelled', 'expired'
  )),

  -- Customer info
  customer_email  text,
  customer_phone  text,
  customer_name   text,
  return_url      text,
  notify_url      text,

  -- Timestamps
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT (now() + INTERVAL '30 minutes'),
  paid_at     timestamptz,

  raw_response jsonb
);

CREATE INDEX IF NOT EXISTS idx_cashfree_sessions_order     ON public.cashfree_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_cashfree_sessions_cf_payment ON public.cashfree_sessions(cf_payment_session_id);
CREATE INDEX IF NOT EXISTS idx_cashfree_sessions_status    ON public.cashfree_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cashfree_sessions_expires   ON public.cashfree_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_cashfree_sessions_user_id   ON public.cashfree_sessions(user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.cashfree_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cashfree_sessions_user_own"  ON public.cashfree_sessions;
DROP POLICY IF EXISTS "cashfree_sessions_admin_all" ON public.cashfree_sessions;

CREATE POLICY "cashfree_sessions_user_own"
  ON public.cashfree_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cashfree_sessions_admin_all"
  ON public.cashfree_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: payment_sessions table — missing from ghost migration 20260325000000
-- (payment_sessions_security migration failed on remote)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     text        NOT NULL UNIQUE,
  order_id       uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount         numeric(10,2) NOT NULL,
  currency       text        NOT NULL DEFAULT 'INR',
  payment_method text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  completed_at   timestamptz,
  transaction_id text,
  metadata       jsonb       DEFAULT '{}'::jsonb,

  CONSTRAINT valid_amount          CHECK (amount > 0),
  CONSTRAINT valid_currency        CHECK (currency = 'INR'),
  CONSTRAINT valid_payment_method  CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cod'))
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON public.payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order_id   ON public.payment_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id    ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status     ON public.payment_sessions(status);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_sessions_user_own"  ON public.payment_sessions;
DROP POLICY IF EXISTS "payment_sessions_admin_all" ON public.payment_sessions;

CREATE POLICY "payment_sessions_user_own"
  ON public.payment_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "payment_sessions_admin_all"
  ON public.payment_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: Final verification
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'average_rating')
  THEN missing := missing || 'products.average_rating, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'review_count')
  THEN missing := missing || 'products.review_count, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'expires_at')
  THEN missing := missing || 'orders.expires_at, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cashfree_sessions')
  THEN missing := missing || 'TABLE:cashfree_sessions, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_sessions')
  THEN missing := missing || 'TABLE:payment_sessions, '; END IF;

  IF missing = '' THEN
    RAISE NOTICE '✅ ALL REPAIR CHECKS PASSED';
  ELSE
    RAISE WARNING '❌ STILL MISSING: %', missing;
  END IF;
END $$;
