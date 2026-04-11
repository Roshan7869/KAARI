/**
 * Tests for Resend Email Client
 *
 * Following TDD: These tests are written BEFORE implementation.
 * They should FAIL initially, then pass after implementation.
 *
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendEmailWithResend,
  validateResendConfig,
  createResendClient,
  type ResendEmailPayload,
  type ResendEmailResponse,
} from '@/lib/resend-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

describe('Resend Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  // ========================================
  // Configuration Validation Tests
  // ========================================
  describe('validateResendConfig', () => {
    it('should return valid when RESEND_API_KEY is set', () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const result = validateResendConfig();

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.apiKey).toBeDefined();
        expect(result.fromEmail).toBeDefined();
      }
    });

    it('should return invalid when RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;

      const result = validateResendConfig();

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('RESEND_API_KEY');
      }
    });

    it('should return invalid when RESEND_API_KEY is empty string', () => {
      process.env.RESEND_API_KEY = '';

      const result = validateResendConfig();

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('RESEND_API_KEY');
      }
    });

    it('should use default from email when NOTIFICATIONS_FROM_EMAIL is not set', () => {
      process.env.RESEND_API_KEY = 're_test123456789';
      delete process.env.NOTIFICATIONS_FROM_EMAIL;

      const result = validateResendConfig();

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fromEmail).toBe('orders@kaari.shop');
      }
    });

    it('should use custom from email when NOTIFICATIONS_FROM_EMAIL is set', () => {
      process.env.RESEND_API_KEY = 're_test123456789';
      process.env.NOTIFICATIONS_FROM_EMAIL = 'custom@example.com';

      const result = validateResendConfig();

      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.fromEmail).toBe('custom@example.com');
      }
    });

    it('should validate API key format (must start with "re_")', () => {
      process.env.RESEND_API_KEY = 'invalid_key_format';

      const result = validateResendConfig();

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('must start with "re_"');
      }
    });
  });

  // ========================================
  // Client Creation Tests
  // ========================================
  describe('createResendClient', () => {
    it('should throw error when API key is missing', () => {
      delete process.env.RESEND_API_KEY;

      expect(() => createResendClient()).toThrow('RESEND_API_KEY');
    });

    it('should return client when API key is valid', () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const client = createResendClient();

      expect(client).toBeDefined();
      expect(client.sendEmail).toBeDefined();
      expect(client.sendEmails).toBeDefined();
    });

    it('should reuse cached client on subsequent calls', () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const client1 = createResendClient();
      const client2 = createResendClient();

      // Should be the same instance (singleton pattern)
      expect(client1).toBe(client2);
    });
  });

  // ========================================
  // Email Sending Tests
  // ========================================
  describe('sendEmailWithResend', () => {
    const validPayload: ResendEmailPayload = {
      to: 'customer@example.com',
      subject: 'Order Confirmation',
      html: '<h1>Your Order</h1><p>Order #12345</p>',
      text: 'Your Order - Order #12345',
    };

    it('should send email successfully with valid payload', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';
      process.env.NOTIFICATIONS_FROM_EMAIL = 'orders@kaari.shop';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456', from: 'orders@kaari.shop' }),
      });

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(true);
      expect(result.id).toBe('email_123456');
      expect(result.error).toBeUndefined();
    });

    it('should use default from address when not specified', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';
      process.env.NOTIFICATIONS_FROM_EMAIL = 'orders@kaari.shop';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      await sendEmailWithResend(validPayload);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.from).toBe('orders@kaari.shop');
    });

    it('should use custom from address when specified in payload', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      const payloadWithFrom: ResendEmailPayload = {
        ...validPayload,
        from: 'custom@example.com',
      };

      await sendEmailWithResend(payloadWithFrom);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.from).toBe('custom@example.com');
    });

    it('should handle Resend API errors gracefully', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          message: 'Invalid API key',
          name: 'invalid_api_key',
        }),
      });

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
      expect(result.id).toBeUndefined();
    });

    it('should handle rate limiting (429) with retry info', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
        json: () => Promise.resolve({
          message: 'Rate limit exceeded',
          name: 'rate_limit_exceeded',
        }),
      });

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
      expect(result.retryAfter).toBe(60);
    });

    it('should validate email format for "to" field', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const invalidPayload: ResendEmailPayload = {
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const result = await sendEmailWithResend(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should validate email format for "from" field', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const invalidPayload: ResendEmailPayload = {
        to: 'valid@example.com',
        from: 'invalid-from',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      const result = await sendEmailWithResend(invalidPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid from email address');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout errors', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          })
      );

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include both html and text in request', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      await sendEmailWithResend(validPayload);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.html).toBe(validPayload.html);
      expect(body.text).toBe(validPayload.text);
    });

    it('should handle multiple recipients (array of emails)', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      const multiRecipientPayload: ResendEmailPayload = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Group Notification',
        html: '<p>Group message</p>',
      };

      const result = await sendEmailWithResend(multiRecipientPayload);

      expect(result.success).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.to).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('should handle reply-to field', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      const payloadWithReplyTo: ResendEmailPayload = {
        ...validPayload,
        replyTo: 'support@kaari.shop',
      };

      await sendEmailWithResend(payloadWithReplyTo);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.reply_to).toBe('support@kaari.shop');
    });

    it('should handle tags for email tracking', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123456' }),
      });

      const payloadWithTags: ResendEmailPayload = {
        ...validPayload,
        tags: [
          { name: 'order_id', value: '12345' },
          { name: 'notification_type', value: 'order_confirmation' },
        ],
      };

      await sendEmailWithResend(payloadWithTags);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.tags).toEqual([
        { name: 'order_id', value: '12345' },
        { name: 'notification_type', value: 'order_confirmation' },
      ]);
    });
  });

  // ========================================
  // Error Handling Edge Cases
  // ========================================
  describe('Error Handling Edge Cases', () => {
    const validPayload: ResendEmailPayload = {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    };

    it('should handle empty subject', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const result = await sendEmailWithResend({
        ...validPayload,
        subject: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subject is required');
    });

    it('should handle empty html content', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      const result = await sendEmailWithResend({
        ...validPayload,
        html: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTML content is required');
    });

    it('should handle Resend API validation errors', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            message: 'Invalid "from" address',
            name: 'validation_error',
          }),
      });

      const result = await sendEmailWithResend(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid "from"');
    });

    it('should handle malformed API response', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Missing 'id' field
      });

      const result = await sendEmailWithResend(validPayload);

      // Should still succeed but log warning
      expect(result.success).toBe(true);
      expect(result.id).toBeUndefined();
    });
  });

  // ========================================
  // Type Safety Tests
  // ========================================
  describe('Type Safety', () => {
    it('should accept valid ResendEmailPayload', () => {
      const payload: ResendEmailPayload = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      // TypeScript should accept this
      expect(payload.to).toBeDefined();
      expect(payload.subject).toBeDefined();
      expect(payload.html).toBeDefined();
    });

    it('should accept optional fields in ResendEmailPayload', () => {
      const payload: ResendEmailPayload = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Plain text',
        from: 'sender@example.com',
        replyTo: 'reply@example.com',
        tags: [{ name: 'type', value: 'order' }],
      };

      expect(payload.text).toBe('Plain text');
      expect(payload.from).toBe('sender@example.com');
      expect(payload.replyTo).toBe('reply@example.com');
      expect(payload.tags).toHaveLength(1);
    });

    it('should return correct ResendEmailResponse shape on success', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_abc123' }),
      });

      const result: ResendEmailResponse = await sendEmailWithResend({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email_abc123');
    });

    it('should return correct ResendEmailResponse shape on error', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const result: ResendEmailResponse = await sendEmailWithResend({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ========================================
  // Security Tests
  // ========================================
  describe('Security', () => {
    it('should sanitize HTML content to prevent XSS', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123' }),
      });

      const maliciousPayload: ResendEmailPayload = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<script>alert("XSS")</script><p>Safe content</p>',
      };

      await sendEmailWithResend(maliciousPayload);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Script tags should be stripped or escaped
      expect(body.html).not.toContain('<script>');
    });

    it('should not log API keys in error messages', async () => {
      process.env.RESEND_API_KEY = 're_secret_key_12345';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const result = await sendEmailWithResend({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.error).not.toContain('re_secret_key_12345');
    });

    it('should validate from email domain for spoofing prevention', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';
      process.env.NOTIFICATIONS_FROM_EMAIL = 'noreply@kaari.shop';

      const payload: ResendEmailPayload = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123' }),
      });

      await sendEmailWithResend(payload);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should use the configured from email
      expect(body.from).toBe('noreply@kaari.shop');
    });
  });

  // ========================================
  // Batch Email Tests
  // ========================================
  describe('Batch Email Sending', () => {
    it('should send multiple emails in batch', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email_123' }),
      });

      const payloads: ResendEmailPayload[] = [
        { to: 'user1@example.com', subject: 'Email 1', html: '<p>1</p>' },
        { to: 'user2@example.com', subject: 'Email 2', html: '<p>2</p>' },
        { to: 'user3@example.com', subject: 'Email 3', html: '<p>3</p>' },
      ];

      const client = createResendClient();
      const results = await client.sendEmails(payloads);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      process.env.RESEND_API_KEY = 're_test123456789';

      // First email succeeds, second fails via API, third succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'email_1' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Rate limited' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'email_3' }),
        });

      const payloads: ResendEmailPayload[] = [
        { to: 'valid@example.com', subject: 'Email 1', html: '<p>1</p>' },
        { to: 'valid2@example.com', subject: 'Email 2', html: '<p>2</p>' },
        { to: 'valid3@example.com', subject: 'Email 3', html: '<p>3</p>' },
      ];

      const client = createResendClient();
      const results = await client.sendEmails(payloads);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });
});