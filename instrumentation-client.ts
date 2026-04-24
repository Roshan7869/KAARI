import * as Sentry from '@sentry/nextjs';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for finer control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

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
