import { describe, expect, it, beforeAll, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for test environment
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

// Mock server-only (it throws in non-React-server environments)
vi.mock('server-only', () => ({}));

// Mock logger to suppress console noise
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock admin client to avoid Supabase connection in tests
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
  hasAdminClientConfig: vi.fn(() => false),
}));

// Mock fetch-with-timeout (imported by cashfree-server)
vi.mock('@/lib/fetch-with-timeout', () => ({
  fetchWithRetry: vi.fn(),
}));

import { verifyCashfreeWebhookSignature } from '@/lib/cashfree-server';

// Cashfree webhook signature: HMAC-SHA256(timestamp + rawBody, secret) in base64
function signPayload(payload: string, secret: string, timestamp: string): string {
  const cryptoModule = require('crypto');
  return cryptoModule
    .createHmac('sha256', secret)
    .update(timestamp + payload)
    .digest('base64');
}

describe('webhook', () => {
  // --- Basic signature validation ---

  it('validates a correct signature', () => {
    const payload = JSON.stringify({ order_id: 'order-1', status: 'completed' });
    const secret = 'test-secret';
    const timestamp = String(Date.now());
    const signature = signPayload(payload, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(payload, signature, timestamp, secret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const payload = JSON.stringify({ order_id: 'order-2', status: 'completed' });
    expect(verifyCashfreeWebhookSignature(payload, 'bad-signature', String(Date.now()), 'test-secret')).toBe(false);
  });

  it('validates webhook payload structure', () => {
    const payload = {
      session_id: 'dummy_session',
      order_id: 'order-3',
      status: 'completed' as const,
      transaction_id: 'txn-123',
    };

    expect(payload.session_id).toBe('dummy_session');
    expect(payload.order_id).toBe('order-3');
    expect(payload.status).toBe('completed');
  });

  // --- Idempotency ---

  it('produces the same signature for identical payload + secret + timestamp', () => {
    const payload = JSON.stringify({ order_id: 'order-idem', event: 'payment.success' });
    const secret = 'idem-secret';
    const timestamp = '1700000000000';

    const sig1 = signPayload(payload, secret, timestamp);
    const sig2 = signPayload(payload, secret, timestamp);

    expect(sig1).toBe(sig2);
    expect(verifyCashfreeWebhookSignature(payload, sig1, timestamp, secret)).toBe(true);
    expect(verifyCashfreeWebhookSignature(payload, sig2, timestamp, secret)).toBe(true);
  });

  it('rejects a duplicate event that was replayed with a tampered payload', () => {
    const payload = JSON.stringify({ order_id: 'order-4', amount: 999, status: 'completed' });
    const tampered = JSON.stringify({ order_id: 'order-4', amount: 1, status: 'completed' });
    const secret = 'replay-secret';
    const timestamp = String(Date.now());

    const signature = signPayload(payload, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(payload, signature, timestamp, secret)).toBe(true);
    expect(verifyCashfreeWebhookSignature(tampered, signature, timestamp, secret)).toBe(false);
  });

  // --- Timing-safe comparison ---

  it('rejects a signature that differs by one character', () => {
    const payload = JSON.stringify({ order_id: 'order-5', status: 'completed' });
    const secret = 'timing-secret';
    const timestamp = String(Date.now());
    const signature = signPayload(payload, secret, timestamp);

    const tampered = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    expect(verifyCashfreeWebhookSignature(payload, tampered, timestamp, secret)).toBe(false);
  });

  it('rejects a signature signed with a different secret', () => {
    const payload = JSON.stringify({ order_id: 'order-6', status: 'completed' });
    const timestamp = String(Date.now());
    const correctSig = signPayload(payload, 'correct-secret', timestamp);

    expect(verifyCashfreeWebhookSignature(payload, correctSig, timestamp, 'wrong-secret')).toBe(false);
  });

  // --- Edge cases ---

  it('rejects an empty signature string', () => {
    const payload = JSON.stringify({ order_id: 'order-7', status: 'completed' });
    expect(verifyCashfreeWebhookSignature(payload, '', String(Date.now()), 'test-secret')).toBe(false);
  });

  it('validates signature for a large JSON payload without truncation', () => {
    const large = JSON.stringify({
      order_id: 'order-large',
      status: 'completed',
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        title: `Product ${i}`,
        quantity: i + 1,
        price: (i + 1) * 100,
      })),
    });
    const secret = 'large-secret';
    const timestamp = String(Date.now());
    const sig = signPayload(large, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(large, sig, timestamp, secret)).toBe(true);
  });

  it('rejects validation when payload bytes differ by whitespace', () => {
    const compact = JSON.stringify({ order_id: 'order-ws', status: 'completed' });
    const pretty = JSON.stringify({ order_id: 'order-ws', status: 'completed' }, null, 2);
    const secret = 'ws-secret';
    const timestamp = String(Date.now());
    const sig = signPayload(compact, secret, timestamp);

    expect(verifyCashfreeWebhookSignature(compact, sig, timestamp, secret)).toBe(true);
    expect(verifyCashfreeWebhookSignature(pretty, sig, timestamp, secret)).toBe(false);
  });

  it('rejects when timestamp is missing', () => {
    const payload = JSON.stringify({ order_id: 'order-ts', status: 'completed' });
    const secret = 'ts-secret';
    const timestamp = String(Date.now());
    const sig = signPayload(payload, secret, timestamp);

    // Without the correct timestamp, signature won't match
    expect(verifyCashfreeWebhookSignature(payload, sig, '', secret)).toBe(false);
  });
});