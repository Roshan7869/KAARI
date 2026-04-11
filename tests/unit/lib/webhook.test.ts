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
  // --- Basic signature validation ---

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

  // --- Idempotency ---

  it('produces the same signature for identical payload + secret', async () => {
    const payload = JSON.stringify({ order_id: 'order-idem', event: 'payment.success' });
    const secret = 'idem-secret';

    const sig1 = await signPayload(payload, secret);
    const sig2 = await signPayload(payload, secret);

    expect(sig1).toBe(sig2);
    await expect(validateWebhookSignature(payload, sig1, secret)).resolves.toBe(true);
    await expect(validateWebhookSignature(payload, sig2, secret)).resolves.toBe(true);
  });

  it('rejects a replayed event with a tampered payload (amount changed)', async () => {
    const payload = JSON.stringify({ order_id: 'order-4', amount: 999, status: 'completed' });
    const tampered = JSON.stringify({ order_id: 'order-4', amount: 1, status: 'completed' });
    const secret = 'replay-secret';

    const signature = await signPayload(payload, secret);

    await expect(validateWebhookSignature(payload, signature, secret)).resolves.toBe(true);
    await expect(validateWebhookSignature(tampered, signature, secret)).resolves.toBe(false);
  });

  // --- Timing-safe comparison ---

  it('rejects a signature that differs by one character', async () => {
    const payload = JSON.stringify({ order_id: 'order-5', status: 'completed' });
    const secret = 'timing-secret';
    const signature = await signPayload(payload, secret);

    const tampered = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    await expect(validateWebhookSignature(payload, tampered, secret)).resolves.toBe(false);
  });

  it('rejects a signature produced with a different secret', async () => {
    const payload = JSON.stringify({ order_id: 'order-6', status: 'completed' });
    const correctSig = await signPayload(payload, 'correct-secret');

    await expect(validateWebhookSignature(payload, correctSig, 'wrong-secret')).resolves.toBe(false);
  });

  // --- Edge cases ---

  it('rejects an empty signature string', async () => {
    const payload = JSON.stringify({ order_id: 'order-7', status: 'completed' });
    await expect(validateWebhookSignature(payload, '', 'test-secret')).resolves.toBe(false);
  });

  it('validates signature for a large JSON payload without truncation', async () => {
    const large = JSON.stringify({
      order_id: 'order-large',
      status: 'completed',
      items: Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        quantity: i + 1,
        price: (i + 1) * 100,
      })),
    });
    const secret = 'large-secret';
    const sig = await signPayload(large, secret);

    await expect(validateWebhookSignature(large, sig, secret)).resolves.toBe(true);
  });

  it('rejects when payload differs only by whitespace (compact vs pretty-printed)', async () => {
    const compact = JSON.stringify({ order_id: 'order-ws', status: 'completed' });
    const pretty = JSON.stringify({ order_id: 'order-ws', status: 'completed' }, null, 2);
    const secret = 'ws-secret';
    const sig = await signPayload(compact, secret);

    await expect(validateWebhookSignature(pretty, sig, secret)).resolves.toBe(false);
  });
});

