import { test, expect, describe } from 'vitest';
import { checkRateLimit, recordAttempt, clearRateLimit } from '@/lib/rateLimit';

describe('Rate Limiting', () => {
  describe('checkRateLimit', () => {
    test('allows requests within limit', () => {
      const result = checkRateLimit('login', 'test-user');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    test('tracks attempts correctly', () => {
      const id = 'test-limit-' + Date.now();
      recordAttempt('login', id);
      recordAttempt('login', id);

      const result = checkRateLimit('login', id);
      expect(result.remaining).toBeLessThan(5);
    });

    test('resets limit on success', () => {
      const id = 'test-success-' + Date.now();
      recordAttempt('login', id);
      recordAttempt('login', id);

      // Reset on success
      recordAttempt('login', id, true);

      const result = checkRateLimit('login', id);
      expect(result.remaining).toBe(5); // Back to max
    });
  });

  describe('clearRateLimit', () => {
    test('clears limit for identifier', () => {
      const id = 'test-clear-' + Date.now();
      recordAttempt('api', id);

      let result = checkRateLimit('api', id);
      expect(result.remaining).toBeLessThan(100);

      clearRateLimit('api', id);

      result = checkRateLimit('api', id);
      expect(result.remaining).toBe(100);
    });
  });
});
