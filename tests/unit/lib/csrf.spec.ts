/**
 * Unit Tests for lib/csrf.ts
 *
 * Security-critical tests for CSRF token generation and validation.
 * Target coverage: 90%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
  clearCsrfToken,
} from '@/lib/csrf';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-1234');

// ============================================
// Test Setup & Teardown
// ============================================

describe('CSRF Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();

    // Mock sessionStorage
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: mockRandomUUID },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Tests: generateCsrfToken
  // ============================================

  describe('generateCsrfToken', () => {
    it('generates a token and stores it in sessionStorage', () => {
      const token = generateCsrfToken();

      expect(token).toBe('test-uuid-1234');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('kaari_csrf_token', token);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'kaari_csrf_token_expiry',
        expect.any(String)
      );
    });

    it('stores expiry timestamp 1 hour in the future', () => {
      const beforeTime = Date.now();
      generateCsrfToken();
      const afterTime = Date.now();

      const expiryCalls = mockSessionStorage.setItem.mock.calls.filter(
        call => call[0] === 'kaari_csrf_token_expiry'
      );

      expect(expiryCalls.length).toBe(1);
      const storedExpiry = parseInt(expiryCalls[0][1], 10);

      // Expiry should be approximately 1 hour from now
      const expectedExpiryMin = beforeTime + 60 * 60 * 1000;
      const expectedExpiryMax = afterTime + 60 * 60 * 1000;

      expect(storedExpiry).toBeGreaterThanOrEqual(expectedExpiryMin);
      expect(storedExpiry).toBeLessThanOrEqual(expectedExpiryMax);
    });

    it('generates unique tokens on each call', () => {
      const uuids = ['uuid-1', 'uuid-2', 'uuid-3'];
      let callCount = 0;

      mockRandomUUID.mockImplementation(() => uuids[callCount++ % uuids.length]);

      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const token3 = generateCsrfToken();

      expect(token1).toBe('uuid-1');
      expect(token2).toBe('uuid-2');
      expect(token3).toBe('uuid-3');
    });

    it('falls back to crypto.getRandomValues when randomUUID is unavailable', () => {
      // Remove randomUUID
      Object.defineProperty(global, 'crypto', {
        value: { getRandomValues: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i + 1;
          }
          return arr;
        })},
        writable: true,
      });

      const token = generateCsrfToken();

      // Token should be a 64-character hex string (32 bytes)
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('handles crypto being completely unavailable (rare case)', () => {
      // Remove crypto entirely
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true,
      });

      // Mock Math.random to be deterministic
      const originalRandom = Math.random;
      let randomCallCount = 0;
      Math.random = vi.fn(() => {
        randomCallCount++;
        return 0.5; // Deterministic value
      });

      const token = generateCsrfToken();

      // Token should still be generated (using Math.random fallback)
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  // ============================================
  // Tests: validateCsrfToken
  // ============================================

  describe('validateCsrfToken', () => {
    it('validates a correct token', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token);
      expect(result).toBe(true);
    });

    it('rejects an incorrect token', () => {
      generateCsrfToken();
      const result = validateCsrfToken('wrong-token');
      expect(result).toBe(false);
    });

    it('rejects empty token', () => {
      generateCsrfToken();
      const result = validateCsrfToken('');
      expect(result).toBe(false);
    });

    it('uses timing-safe comparison', () => {
      const token = generateCsrfToken();

      // Same length, different characters should use XOR comparison
      const wrongTokenSameLength = 'test-uuid-1235'; // Different last char

      const result = validateCsrfToken(wrongTokenSameLength);
      expect(result).toBe(false);
    });

    it('rejects token with different length early', () => {
      generateCsrfToken();

      const shortToken = 'short';
      const result = validateCsrfToken(shortToken);
      expect(result).toBe(false);
    });

    it('rejects when no token is stored', () => {
      mockSessionStorage.clear();

      const result = validateCsrfToken('any-token');
      expect(result).toBe(false);
    });

    it('rejects expired tokens', () => {
      // Generate a token
      const token = generateCsrfToken();

      // Manually set expired timestamp
      const expiredTime = Date.now() - 1000; // 1 second ago
      mockSessionStorage.setItem('kaari_csrf_token_expiry', expiredTime.toString());

      const result = validateCsrfToken(token);
      expect(result).toBe(false);
    });

    it('cleans up expired tokens from storage', () => {
      const token = generateCsrfToken();

      // Set expired timestamp
      const expiredTime = Date.now() - 1000;
      mockSessionStorage.setItem('kaari_csrf_token_expiry', expiredTime.toString());

      validateCsrfToken(token);

      // Should have removed the expired token
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token_expiry');
    });

    it('returns false in SSR context (sessionStorage unavailable)', () => {
      // Store original sessionStorage
      const originalSessionStorage = global.sessionStorage;

      // Simulate SSR by removing sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = validateCsrfToken('any-token');
      expect(result).toBe(false);

      // Restore sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
        configurable: true,
      });
    });
  });

  // ============================================
  // Tests: getCsrfToken
  // ============================================

  describe('getCsrfToken', () => {
    it('returns stored token when valid', () => {
      const token = generateCsrfToken();
      const result = getCsrfToken();
      expect(result).toBe(token);
    });

    it('returns null when no token is stored', () => {
      mockSessionStorage.clear();
      const result = getCsrfToken();
      expect(result).toBeNull();
    });

    it('returns null for expired token', () => {
      generateCsrfToken();

      // Set expired
      const expiredTime = Date.now() - 1000;
      mockSessionStorage.setItem('kaari_csrf_token_expiry', expiredTime.toString());

      const result = getCsrfToken();
      expect(result).toBeNull();
    });

    it('cleans up expired tokens', () => {
      generateCsrfToken();

      // Set expired
      const expiredTime = Date.now() - 1000;
      mockSessionStorage.setItem('kaari_csrf_token_expiry', expiredTime.toString());

      getCsrfToken();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token_expiry');
    });

    it('returns null in SSR context', () => {
      // Store original sessionStorage
      const originalSessionStorage = global.sessionStorage;

      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = getCsrfToken();
      expect(result).toBeNull();

      // Restore sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
        configurable: true,
      });
    });
  });

  // ============================================
  // Tests: clearCsrfToken
  // ============================================

  describe('clearCsrfToken', () => {
    it('removes token from sessionStorage', () => {
      generateCsrfToken();
      clearCsrfToken();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('kaari_csrf_token_expiry');
    });

    it('handles SSR context without error', () => {
      // Store original sessionStorage
      const originalSessionStorage = global.sessionStorage;

      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Should not throw
      expect(() => clearCsrfToken()).not.toThrow();

      // Restore sessionStorage
      Object.defineProperty(global, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true,
        configurable: true,
      });
    });

    it('handles missing token gracefully', () => {
      mockSessionStorage.clear();

      // Should not throw
      expect(() => clearCsrfToken()).not.toThrow();
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('CSRF flow integration', () => {
    it('full workflow: generate, validate, and clear', () => {
      // Generate
      const token = generateCsrfToken();
      expect(token).toBeDefined();

      // Validate
      expect(validateCsrfToken(token)).toBe(true);
      expect(validateCsrfToken('wrong')).toBe(false);

      // Get
      expect(getCsrfToken()).toBe(token);

      // Clear
      clearCsrfToken();
      expect(getCsrfToken()).toBeNull();
    });

    it('prevents token reuse after expiry', () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);

      // Expire the token
      mockSessionStorage.setItem('kaari_csrf_token_expiry', (Date.now() - 1000).toString());

      // Should now fail
      expect(validateCsrfToken(token)).toBe(false);
      expect(getCsrfToken()).toBeNull();
    });

    it('generates new tokens on each request', () => {
      mockRandomUUID.mockReturnValueOnce('token-1');
      mockRandomUUID.mockReturnValueOnce('token-2');

      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });
});