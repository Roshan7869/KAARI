import { describe, it, expect } from 'vitest';
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree-server';
import crypto from 'crypto';

describe('verifyCashfreeWebhookSignature', () => {
  const secret = 'test-webhook-secret';
  const rawBody = '{"order_id":"test"}';
  const timestamp = String(Date.now());

  function generateValidSignature(body: string, ts: string, sec: string): string {
    const signedPayload = ts + body;
    return crypto.createHmac('sha256', sec).update(signedPayload).digest('base64');
  }

  it('returns true for valid signature', () => {
    const signature = generateValidSignature(rawBody, timestamp, secret);
    expect(verifyCashfreeWebhookSignature(rawBody, signature, timestamp, secret)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyCashfreeWebhookSignature(rawBody, 'invalid-sig', timestamp, secret)).toBe(false);
  });

  it('returns false when secret is missing', () => {
    const signature = generateValidSignature(rawBody, timestamp, secret);
    expect(verifyCashfreeWebhookSignature(rawBody, signature, timestamp, '')).toBe(false);
  });

  it('returns false when signature is missing', () => {
    expect(verifyCashfreeWebhookSignature(rawBody, '', timestamp, secret)).toBe(false);
  });

  it('returns false for tampered body', () => {
    const signature = generateValidSignature(rawBody, timestamp, secret);
    expect(verifyCashfreeWebhookSignature(rawBody + 'x', signature, timestamp, secret)).toBe(false);
  });

  it('returns false for tampered timestamp', () => {
    const signature = generateValidSignature(rawBody, timestamp, secret);
    expect(verifyCashfreeWebhookSignature(rawBody, signature, String(Number(timestamp) + 1), secret)).toBe(false);
  });
});
