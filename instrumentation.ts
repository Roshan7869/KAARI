export async function onRequestError(
  err: unknown,
  request: Request,
  context: unknown,
) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    await Sentry.captureRequestError(err, request as unknown as Parameters<typeof Sentry.captureRequestError>[1], context as Parameters<typeof Sentry.captureRequestError>[2]);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    // W4: Required env var validation at startup
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `[ENV] Missing required environment variables: ${missing.join(', ')}. ` +
        'The app will not function correctly without these.'
      );
    }

    // W2: Cashfree mode mismatch check: fail loudly at startup if env vars disagree
    const serverMode = (process.env.CASHFREE_MODE?.trim().toLowerCase() ?? 'sandbox');
    const clientMode = process.env.NEXT_PUBLIC_CASHFREE_MODE?.trim().toLowerCase() ?? serverMode;
    if (clientMode !== serverMode) {
      console.error(
        `[CASHFREE MODE MISMATCH] Server resolved mode=${serverMode} but NEXT_PUBLIC_CASHFREE_MODE="${clientMode}". ` +
        'Fix your env vars before deploying to avoid sandbox/production misrouting.'
      );
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}