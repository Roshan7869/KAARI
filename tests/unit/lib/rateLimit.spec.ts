/**
 * Unit Tests for lib/client-rate-limit.ts
 *
 * The rate limiter is synchronous and in-memory.
 * - checkRateLimit: reads state, does NOT increment
 * - recordAttempt:  increments the counter (or resets on success)
 * - clearRateLimit: resets counter for an identifier
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  logSecurityEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) } },
}));

import {
  RATE_LIMITS,
  checkRateLimit,
  recordAttempt,
  clearRateLimit,
  getRemainingAttempts,
  checkLoginRateLimit,
  checkCheckoutRateLimit,
  checkPaymentRateLimit,
  checkApiRateLimit,
  enableFallbackMode,
  resetFallbackMode,
  isFallbackMode,
} from '@/lib/client-rate-limit';

// Each test uses a unique id to avoid cross-test state pollution
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

describe('RATE_LIMITS configuration', () => {
  it('defines login rate limits', () => {
    expect(RATE_LIMITS.login).toEqual({
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });
  });

  it('defines signup rate limits', () => {
    expect(RATE_LIMITS.signup).toEqual({
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });
  });

  it('defines payment rate limits', () => {
    expect(RATE_LIMITS.payment).toEqual({
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });
  });

  it('defines checkout rate limits', () => {
    expect(RATE_LIMITS.checkout).toEqual({
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });
  });

  it('defines API rate limits', () => {
    expect(RATE_LIMITS.api).toEqual({
      maxAttempts: 100,
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000,
    });
  });
});

describe('compatibility stubs (enableFallbackMode / resetFallbackMode)', () => {
  it('isFallbackMode always returns false', () => {
    expect(isFallbackMode()).toBe(false);
    enableFallbackMode();
    expect(isFallbackMode()).toBe(false);
    resetFallbackMode();
    expect(isFallbackMode()).toBe(false);
  });
});

describe('checkRateLimit', () => {
  it('allows a fresh identifier with full remaining count', () => {
    const id = uid();
    const result = checkRateLimit('login', id);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.login.maxAttempts);
    expect(result.blocked).toBe(false);
  });

  it('reflects recorded attempts in remaining count', () => {
    const id = uid();
    recordAttempt('login', id, false);
    recordAttempt('login', id, false);
    const result = checkRateLimit('login', id);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.login.maxAttempts - 2);
  });

  it('blocks when attempts exceed maxAttempts', () => {
    const id = uid();
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      recordAttempt('login', id, false);
    }
    const result = checkRateLimit('login', id);
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('provides a resetAt Date when blocked', () => {
    const id = uid();
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      recordAttempt('login', id, false);
    }
    const result = checkRateLimit('login', id);
    expect(result.resetAt).toBeInstanceOf(Date);
  });
});

describe('recordAttempt', () => {
  it('increments counter on failure', () => {
    const id = uid();
    recordAttempt('login', id, false);
    expect(getRemainingAttempts('login', id)).toBe(RATE_LIMITS.login.maxAttempts - 1);
  });

  it('resets counter on success', () => {
    const id = uid();
    recordAttempt('login', id, false);
    recordAttempt('login', id, false);
    recordAttempt('login', id, true); // success → reset
    expect(getRemainingAttempts('login', id)).toBe(RATE_LIMITS.login.maxAttempts);
  });
});

describe('clearRateLimit', () => {
  it('resets counter for identifier', () => {
    const id = uid();
    recordAttempt('login', id, false);
    recordAttempt('login', id, false);
    clearRateLimit('login', id);
    expect(getRemainingAttempts('login', id)).toBe(RATE_LIMITS.login.maxAttempts);
  });
});

describe('getRemainingAttempts', () => {
  it('returns maxAttempts when no attempts made', () => {
    const id = uid();
    expect(getRemainingAttempts('login', id)).toBe(RATE_LIMITS.login.maxAttempts);
  });

  it('decreases after recordAttempt calls', () => {
    const id = uid();
    recordAttempt('login', id, false);
    recordAttempt('login', id, false);
    recordAttempt('login', id, false);
    expect(getRemainingAttempts('login', id)).toBe(RATE_LIMITS.login.maxAttempts - 3);
  });

  it('returns 0 when blocked', () => {
    const id = uid();
    for (let i = 0; i < RATE_LIMITS.login.maxAttempts; i++) {
      recordAttempt('login', id, false);
    }
    expect(getRemainingAttempts('login', id)).toBe(0);
  });
});

describe('Convenience functions', () => {
  it('checkLoginRateLimit allows fresh user', () => {
    const result = checkLoginRateLimit(`${uid()}@example.com`);
    expect(result.allowed).toBe(true);
  });

  it('checkCheckoutRateLimit allows fresh user', () => {
    const result = checkCheckoutRateLimit(uid());
    expect(result.allowed).toBe(true);
  });

  it('checkPaymentRateLimit allows fresh user', () => {
    const result = checkPaymentRateLimit(uid());
    expect(result.allowed).toBe(true);
  });

  it('checkApiRateLimit allows fresh IP', () => {
    const result = checkApiRateLimit(`192.168.${Math.floor(Math.random() * 255)}.1`);
    expect(result.allowed).toBe(true);
  });
});

describe('Independent tracking', () => {
  it('tracks different types independently', () => {
    const id = uid();
    recordAttempt('login', id, false);
    // checkout for same identifier has separate counter
    const checkoutResult = checkRateLimit('checkout', id);
    expect(checkoutResult.remaining).toBe(RATE_LIMITS.checkout.maxAttempts);
  });

  it('tracks different identifiers independently', () => {
    const id1 = uid();
    const id2 = uid();
    recordAttempt('login', id1, false);
    recordAttempt('login', id1, false);
    // id2 unaffected
    expect(getRemainingAttempts('login', id2)).toBe(RATE_LIMITS.login.maxAttempts);
  });
});
