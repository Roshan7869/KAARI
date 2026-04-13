import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  debug: false,

  // Trace propagation targets — only propagate traces to our own services
  tracePropagationTargets: [
    'localhost',
    /^\//,
    /^https:\/\/kaari\.in/,
    /^https:\/\/.*\.supabase\.co/,
    /^https:\/\/api\.cashfree\.com/,
    /^https:\/\/sandbox\.cashfree\.com/,
  ],

  // Filter out bot/crawler requests
  beforeSend(event) {
    const userAgent = event.request?.headers?.['user-agent'] ?? '';
    if (typeof userAgent === 'string' && /bot|crawl|spider|slurp/i.test(userAgent)) {
      return null;
    }
    return event;
  },
});