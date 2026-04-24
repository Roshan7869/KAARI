import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger-server';

/**
 * Server-side rate limiting using Upstash Redis.
 * Gracefully degrades when UPSTASH env vars are not set (e.g. local dev).
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

function createRatelimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token || !url.startsWith('https://')) {
    return null;
  }

  const redis = new Redis({ url, token });

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
    // Mutation routes — 20 req / 1 min (cart, orders, reviews, wishlist)
    mutation: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix:    'kaari:rl:mutation',
    }),
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
    // Enhanced checkout ordering — 5 orders per minute per user
    checkoutOrders: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(5, '1 m'), // 5 orders per minute per user
      analytics: true,
      prefix:    'kaari:rl:checkout-orders-user',
    }),
    // Enhanced checkout ordering — 20 orders per minute per IP
    checkoutOrdersIp: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(20, '1 m'), // 20 orders per minute per IP
      analytics: true,
      prefix:    'kaari:rl:checkout-orders-ip',
    }),
    // Enhanced checkout ordering — 100 orders per minute global
    checkoutOrdersGlobal: new Ratelimit({
      redis,
      limiter:   Ratelimit.slidingWindow(100, '1 m'), // 100 orders per minute global
      analytics: true,
      prefix:    'kaari:rl:checkout-orders-global',
    }),
  };
}

// Singleton — only initializes once per worker process
const limiters = createRatelimiters();

type LimiterKey = 'api' | 'auth' | 'checkout' | 'webhook' | 'checkoutOrders' | 'checkoutOrdersIp' | 'checkoutOrdersGlobal' | 'mutation';

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

/**
 * Apply enhanced rate limiting for checkout orders with multiple constraints:
 * - Per-user limit: 5 orders per minute per user
 * - Per-IP limit: 20 orders per minute per IP
 * - Global limit: 100 orders per minute total
 *
 * @param request - NextRequest object
 * @param userId - Authenticated user ID
 * @param failClosed - When true, returns 503 if Redis is unavailable
 * @returns NextResponse with 429 if rate limited, null if allowed
 */
export async function applyCheckoutRateLimits(
  request: NextRequest,
  userId: string,
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
    // Check per-user limit (5 orders per minute)
    const userKey = `user:${userId}`;
    const { success: userSuccess, reset: userReset } = await limiters.checkoutOrders.limit(userKey);

    if (!userSuccess) {
      const retryAfterSeconds = Math.ceil((userReset - Date.now()) / 1000);
      logger.warn('Rate limit exceeded', {
        userId,
        ip,
        type: 'user',
        retryAfter: retryAfterSeconds
      });
      return NextResponse.json(
        {
          error: 'Too many orders. Please wait 1 minute before placing another order.',
          code: 'RATE_LIMITED_USER',
          retry_after: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // Check per-IP limit (20 orders per minute)
    const ipKey = `ip:${ip}`;
    const { success: ipSuccess, reset: ipReset } = await limiters.checkoutOrdersIp.limit(ipKey);

    if (!ipSuccess) {
      const retryAfterSeconds = Math.ceil((ipReset - Date.now()) / 1000);
      logger.warn('Rate limit exceeded', {
        userId,
        ip,
        type: 'ip',
        retryAfter: retryAfterSeconds
      });
      return NextResponse.json(
        {
          error: 'Too many requests from this IP address. Please wait 1 minute.',
          code: 'RATE_LIMITED_IP',
          retry_after: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // Check global limit (100 orders per minute)
    const globalKey = 'global';
    const { success: globalSuccess, reset: globalReset } = await limiters.checkoutOrdersGlobal.limit(globalKey);

    if (!globalSuccess) {
      const retryAfterSeconds = Math.ceil((globalReset - Date.now()) / 1000);
      logger.warn('Global rate limit exceeded', {
        userId,
        ip,
        type: 'global',
        retryAfter: retryAfterSeconds
      });
      return NextResponse.json(
        {
          error: 'Service temporarily busy. Please try again in 1 minute.',
          code: 'RATE_LIMITED_GLOBAL',
          retry_after: retryAfterSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    return null; // All limits passed
  } catch (error) {
    logger.error('Rate limit check failed', {
      error: (error as Error).message,
      userId,
      ip
    });

    // Redis threw an unexpected error
    if (failClosed) {
      return NextResponse.json(
        { error: 'Rate limit service error. Please try again shortly.', code: 'RATE_LIMIT_ERROR' },
        { status: 503 }
      );
    }
    return null; // fail open — Redis errors must not block legitimate requests
  }
}
