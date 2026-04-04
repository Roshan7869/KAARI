import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Server-side rate limiting using Upstash Redis.
 * Gracefully degrades when UPSTASH env vars are not set (e.g. local dev).
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

function createRatelimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim() || !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
  });

  return {
    // General API — 60 req / 1 min per IP
    api: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix:    'kaari:rl:api',
    }),
    // Auth routes — 10 attempts / 15 min (brute-force protection)
    auth: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(10, '15 m'),
      analytics: true,
      prefix:    'kaari:rl:auth',
    }),
    // Checkout page — 20 req / 5 min (prevent checkout spam)
    checkout: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(20, '5 m'),
      analytics: true,
      prefix:    'kaari:rl:checkout',
    }),
    // Webhooks — 200 req / 1 min
    webhook: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(200, '1 m'),
      analytics: true,
      prefix:    'kaari:rl:webhook',
    }),
  };
}

// Singleton — only initializes once per worker process
const limiters = createRatelimiters();

type LimiterKey = 'api' | 'auth' | 'checkout' | 'webhook';

/**
 * Apply rate limiting. Returns 429 NextResponse on limit exceeded, null to allow.
 *
 * @param failClosed - When true, returns 503 if Redis is unavailable (use for auth/payment routes).
 *                     When false (default), allows requests through if Redis is down (fail open).
 */
export async function applyRateLimit(
  request: NextRequest,
  limiterKey: LimiterKey = 'api',
  failClosed = false
): Promise<NextResponse | null> {
  if (!limiters) {
    // Redis not configured
    if (failClosed) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again in a moment.', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }
    return null; // fail open for low-risk
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  try {
    const { success, reset } = await limiters[limiterKey].limit(ip);

    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', code: 'RATE_LIMITED', retry_after: retryAfterSeconds },
        {
          status:  429,
          headers: {
            'Retry-After':           String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    return null;
  } catch {
    // Redis threw an unexpected error
    if (failClosed) {
      return NextResponse.json(
        { error: 'Rate limit service error. Please try again shortly.', code: 'RATE_LIMIT_ERROR' },
        { status: 503 }
      );
    }
    return null; // fail open — Redis errors must not block legitimate requests on low-risk routes
  }
}
