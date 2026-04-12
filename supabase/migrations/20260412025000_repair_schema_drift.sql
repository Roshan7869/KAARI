-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260412035000_repair_schema_drift.sql
-- Purpose:   Fix schema drift — add columns that were recorded as applied
--            in migration history but never actually created on remote DB.
--            All statements are idempotent (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. product_media: add is_primary column ────────────────────────────
-- Used by seed migration and ProductGrid/RelatedProducts components
ALTER TABLE public.product_media
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Set the first media item per product as primary if none exist
UPDATE public.product_media pm
SET is_primary = true
WHERE pm.sort_order = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.product_media pm2
    WHERE pm2.product_id = pm.product_id AND pm2.is_primary = true
  );

-- ── 2. profiles: add notification columns (ghost from 20260321000000) ───
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT false;

-- ── 3. profiles: add updated_at and deleted_at (needed by Clerk webhook) ─
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── 4. Drop FK constraint on profiles.id ────────────────────────────────
-- Clerk is the primary auth provider — Clerk user IDs don't exist in auth.users.
-- Without dropping this FK, the Clerk webhook cannot insert profile rows.
-- The id column remains PRIMARY KEY (UUID), just no longer FK to auth.users.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ── 5. Verification ─────────────────────────────────────────────────────
DO $$
DECLARE
  missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_media' AND column_name = 'is_primary')
  THEN missing := missing || 'product_media.is_primary, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_notifications_enabled')
  THEN missing := missing || 'profiles.email_notifications_enabled, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at')
  THEN missing := missing || 'profiles.updated_at, '; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'deleted_at')
  THEN missing := missing || 'profiles.deleted_at, '; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'profiles'
    AND constraint_name = 'profiles_id_fkey' AND constraint_type = 'FOREIGN KEY')
  THEN missing := missing || 'profiles_id_fkey FK (should be dropped), '; END IF;

  IF missing = '' THEN
    RAISE NOTICE '✅ ALL SCHEMA DRIFT REPAIRS VERIFIED';
  ELSE
    RAISE WARNING '❌ STILL MISSING: %', missing;
  END IF;
END $$;