import { describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
} from '@/lib/client-rate-limit';

describe('rateLimit', () => {
  it('allows fresh attempts', () => {
    const key = `user-${Date.now()}`;
    const result = checkRateLimit('checkout', key);
    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('blocks after max attempts are recorded', () => {
    const key = `user-block-${Date.now()}`;
    clearRateLimit('login', key);

    for (let i = 0; i < 5; i++) {
      recordAttempt('login', key);
    }

    const result = checkRateLimit('login', key);
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.remaining).toBe(0);
  });
});
