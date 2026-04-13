/**
 * Webhook signature validation spec
 * Tests Cashfree's HMAC-SHA256 format: sign(timestamp + rawBody, secret)
 */
import { describe, it, expect, vi } from 'vitest';

// Mock server-only (it throws in non-React-server environments)
vi.mock('server-only', () => ({}));

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
  hasAdminClientConfig: vi.fn(() => false),
}));
vi.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithRetry: vi.fn(),
}));
vi.mock('@/lib/config', () => ({
  config: { appUrl: 'http://localhost:3000' },
}));

import { verifyCashfreeWebhookSignature } from '@/lib/cashfree-server';

async function signPayload(payload: string, secret: string, timestamp: string): Promise<string> {
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

describe('webhook signature validation', () => {
  it('validates a correct signature with timestamp', async () => {
    const payload = JSON.stringify({ order_id: 'order-1', status: 'completed' });
    const secret = 'test-secret';
    const timestamp = String(Date.now());
    const signature = await signPayload(payload, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(payload, signature, timestamp, secret)).toBe(true);
  });

  it('rejects a signature with wrong timestamp', async () => {
    const payload = JSON.stringify({ order_id: 'order-2', status: 'completed' });
    const secret = 'test-secret';
    const timestamp = String(Date.now());
    const signature = await signPayload(payload, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(payload, signature, String(Date.now() + 9999), secret)).toBe(false);
  });
});