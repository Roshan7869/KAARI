/**
 * Unit Tests for lib/webhook.ts
 *
 * Security-critical tests for webhook signature validation.
 * Uses Cashfree's HMAC-SHA256 format: sign(timestamp + rawBody, secret)
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock logger to suppress console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock admin client to avoid Supabase connection in tests
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
  hasAdminClientConfig: vi.fn(() => false),
}));

// Mock config to avoid env var issues
vi.mock('@/lib/config', () => ({
  config: {
    appUrl: 'http://localhost:3000',
  },
}));

import { verifyCashfreeWebhookSignature } from '@/lib/cashfree';

// Generate HMAC-SHA256 signature matching Cashfree's format: timestamp + rawBody
async function generateSignature(payload: string, secret: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp + payload));
  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

// ============================================
// Tests: verifyCashfreeWebhookSignature
// ============================================

describe('verifyCashfreeWebhookSignature', () => {
  describe('HMAC-SHA256 signature validation', () => {
    it('validates correctly signed payloads', async () => {
      const payload = '{"order_id":"123","status":"completed"}';
      const secret = 'test-webhook-secret';
      const timestamp = String(Date.now());
      const signature = await generateSignature(payload, secret, timestamp);

      const result = verifyCashfreeWebhookSignature(payload, signature, timestamp, secret);
      expect(result).toBe(true);
    });

    it('rejects tampered signatures', async () => {
      const payload = '{"order_id":"123","status":"completed"}';
      const secret = 'test-webhook-secret';
      const wrongSecret = 'wrong-secret';
      const timestamp = String(Date.now());
      const signature = await generateSignature(payload, wrongSecret, timestamp);

      const result = verifyCashfreeWebhookSignature(payload, signature, timestamp, secret);
      expect(result).toBe(false);
    });

    it('rejects tampered payloads', async () => {
      const originalPayload = '{"order_id":"123","status":"completed"}';
      const tamperedPayload = '{"order_id":"123","status":"failed"}';
      const secret = 'test-webhook-secret';
      const timestamp = String(Date.now());
      const signature = await generateSignature(originalPayload, secret, timestamp);

      const result = verifyCashfreeWebhookSignature(tamperedPayload, signature, timestamp, secret);
      expect(result).toBe(false);
    });

    it('rejects signatures with wrong timestamp', async () => {
      const payload = '{"order_id":"123","status":"completed"}';
      const secret = 'test-webhook-secret';
      const timestamp = String(Date.now());
      const wrongTimestamp = String(Date.now() - 600000); // 10 min ago
      const signature = await generateSignature(payload, secret, timestamp);

      // Signature was computed with `timestamp`, but we verify with `wrongTimestamp`
      const result = verifyCashfreeWebhookSignature(payload, signature, wrongTimestamp, secret);
      expect(result).toBe(false);
    });
  });

  describe('Missing/invalid parameters', () => {
    it('returns false for empty secret', () => {
      const result = verifyCashfreeWebhookSignature('payload', 'sig', 'timestamp', '');
      expect(result).toBe(false);
    });

    it('returns false for empty signature', () => {
      const result = verifyCashfreeWebhookSignature('payload', '', 'timestamp', 'secret');
      expect(result).toBe(false);
    });

    it('returns false for null-like values', () => {
      expect(verifyCashfreeWebhookSignature(null as unknown as string, 'sig', 'ts', 'secret')).toBe(false);
      expect(verifyCashfreeWebhookSignature('payload', null as unknown as string, 'ts', 'secret')).toBe(false);
      expect(verifyCashfreeWebhookSignature('payload', 'sig', 'ts', null as unknown as string)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles special characters in payload', async () => {
      const payload = '{"name":"O\'Brien","emoji":"🎉","special":"<script>"}';
      const secret = 'test-secret';
      const timestamp = String(Date.now());
      const signature = await generateSignature(payload, secret, timestamp);

      expect(verifyCashfreeWebhookSignature(payload, signature, timestamp, secret)).toBe(true);
    });

    it('handles very large payloads', async () => {
      const payload = JSON.stringify({ data: 'x'.repeat(10000) });
      const secret = 'test-secret';
      const timestamp = String(Date.now());
      const signature = await generateSignature(payload, secret, timestamp);

      expect(verifyCashfreeWebhookSignature(payload, signature, timestamp, secret)).toBe(true);
    });
  });
});