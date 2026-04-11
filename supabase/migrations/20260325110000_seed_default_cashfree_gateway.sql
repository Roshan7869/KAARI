-- Seed default Cashfree gateway configuration for new environments.
-- Stored as inactive + test mode so it is safe by default.

INSERT INTO public.payment_gateways (
  provider,
  is_active,
  is_test_mode,
  api_key,
  api_secret,
  webhook_secret,
  config
)
VALUES (
  'cashfree',
  false,
  true,
  '',
  '',
  '',
  jsonb_build_object(
    'version', '2023-08-01',
    'environment', 'sandbox',
    'notes', 'Default seeded config. Set credentials and activate from admin settings.'
  )
)
ON CONFLICT (provider)
DO UPDATE
SET
  is_test_mode = COALESCE(public.payment_gateways.is_test_mode, true),
  config = public.payment_gateways.config || EXCLUDED.config,
  updated_at = now();
