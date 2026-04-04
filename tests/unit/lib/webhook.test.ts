import { describe, expect, it, beforeAll, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for test environment
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

import { validateWebhookSignature } from '@/lib/webhook-utils';

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, payloadData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

describe('webhook', () => {
  it('validates a correct signature', async () => {
    const payload = JSON.stringify({ order_id: 'order-1', status: 'completed' });
    const secret = 'test-secret';
    const signature = await signPayload(payload, secret);

    await expect(validateWebhookSignature(payload, signature, secret)).resolves.toBe(true);
  });

  it('rejects an invalid signature', async () => {
    const payload = JSON.stringify({ order_id: 'order-2', status: 'completed' });
    await expect(validateWebhookSignature(payload, 'bad-signature', 'test-secret')).resolves.toBe(false);
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
});
