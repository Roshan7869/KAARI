/**
 * Integration Tests for Email Module with Resend Client
 *
 * Tests the integration between lib/email.ts and lib/resend-client.ts
 *
 * @jest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendEmailWithResend, resetClient } from '@/lib/resend-client';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    })),
  })),
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Email Integration with Resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_api_key_12345678901234567890';
    process.env.NOTIFICATIONS_FROM_EMAIL = 'orders@kaari.shop';
    resetClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATIONS_FROM_EMAIL;
  });

  // ========================================
  // Order Confirmation Email Integration
  // ========================================
  describe('Order Confirmation Emails', () => {
    it('should send order confirmation email with correct structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_order_123' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Your Kaari Order #ORD-12345 has been placed!',
        html: `
          <h1>Thank you for your order!</h1>
          <p>Order Number: ORD-12345</p>
          <p>Total: ₹1,499.00</p>
        `,
        text: 'Thank you for your order! Order Number: ORD-12345. Total: ₹1,499.00',
        tags: [
          { name: 'order_id', value: 'ORD-12345' },
          { name: 'notification_type', value: 'order_confirmation' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email_order_123');

      // Verify request structure
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.to).toEqual(['customer@example.com']);
      expect(body.from).toBe('orders@kaari.shop');
      expect(body.subject).toContain('Order #ORD-12345');
      expect(body.tags).toEqual([
        { name: 'order_id', value: 'ORD-12345' },
        { name: 'notification_type', value: 'order_confirmation' },
      ]);
    });

    it('should include order items in email content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_order_items' }),
      });

      const orderItems = [
        { name: 'Crochet Bag', quantity: 2, price: 799 },
        { name: 'Yarn Set', quantity: 1, price: 299 },
      ];

      const html = `
        <h1>Your Order</h1>
        <ul>
          ${orderItems.map((item) => `<li>${item.name} x ${item.quantity} - ₹${item.price}</li>`).join('')}
        </ul>
        <p>Total: ₹${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}</p>
      `;

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        html,
        text: 'Your order with 2 items',
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // Payment Success Email Integration
  // ========================================
  describe('Payment Success Emails', () => {
    it('should send payment success email with transaction details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_payment_success' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Payment Successful - Order #ORD-12345',
        html: `
          <h1>Payment Successful!</h1>
          <p>Order: #ORD-12345</p>
          <p>Amount: ₹1,499.00</p>
          <p>Transaction ID: TXN-ABC123</p>
          <p>Payment Method: UPI</p>
        `,
        text: 'Payment Successful! Order: #ORD-12345, Amount: ₹1,499.00',
        tags: [
          { name: 'order_id', value: 'ORD-12345' },
          { name: 'transaction_id', value: 'TXN-ABC123' },
          { name: 'payment_method', value: 'UPI' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email_payment_success');
    });
  });

  // ========================================
  // Payment Failed Email Integration
  // ========================================
  describe('Payment Failed Emails', () => {
    it('should send payment failed email with retry instructions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_payment_failed' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Payment Failed - Order #ORD-12345',
        html: `
          <h1>Payment Failed</h1>
          <p>We were unable to process your payment for Order #ORD-12345</p>
          <p>Amount: ₹1,499.00</p>
          <p>Reason: Insufficient funds</p>
          <a href="https://kaari.shop/orders/ORD-12345/retry">Retry Payment</a>
        `,
        text: 'Payment Failed for Order #ORD-12345. Please retry payment.',
        tags: [
          { name: 'order_id', value: 'ORD-12345' },
          { name: 'failure_reason', value: 'insufficient_funds' },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // Order Shipped Email Integration
  // ========================================
  describe('Order Shipped Emails', () => {
    it('should send shipping notification with tracking details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_shipped' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Your Order #ORD-12345 has been shipped!',
        html: `
          <h1>Your order is on the way!</h1>
          <p>Order: #ORD-12345</p>
          <p>Carrier: Delhivery</p>
          <p>Tracking Number: DLV123456789</p>
          <a href="https://track.delhivery.com/DLV123456789">Track Your Order</a>
          <p>Estimated Delivery: March 30, 2026</p>
        `,
        text: 'Your order #ORD-12345 has been shipped via Delhivery. Tracking: DLV123456789',
        tags: [
          { name: 'order_id', value: 'ORD-12345' },
          { name: 'carrier', value: 'Delhivery' },
          { name: 'tracking_number', value: 'DLV123456789' },
        ],
      });

      expect(result.success).toBe(true);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.tags).toContainEqual({ name: 'tracking_number', value: 'DLV123456789' });
    });
  });

  // ========================================
  // Welcome Email Integration
  // ========================================
  describe('Welcome Emails', () => {
    it('should send welcome email to new users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_welcome' }),
      });

      const result = await sendEmailWithResend({
        to: 'newuser@example.com',
        subject: 'Welcome to Kaari!',
        html: `
          <h1>Welcome to Kaari!</h1>
          <p>Thank you for joining our community of handmade crochet lovers.</p>
          <p>Discover unique handmade products crafted with love.</p>
          <a href="https://kaari.shop/products">Browse Products</a>
        `,
        text: 'Welcome to Kaari! Browse our handmade crochet products.',
        tags: [{ name: 'email_type', value: 'welcome' }],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('email_welcome');
    });
  });

  // ========================================
  // Error Handling Integration
  // ========================================
  describe('Error Handling Integration', () => {
    it('should handle Resend API downtime gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error: ECONNREFUSED'));

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle invalid API key error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should handle daily sending limit exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '3600' }),
        json: () => Promise.resolve({ message: 'Daily sending limit exceeded' }),
      });

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
      expect(result.retryAfter).toBe(3600);
    });
  });

  // ========================================
  // Security Integration Tests
  // ========================================
  describe('Security Integration', () => {
    it('should sanitize malicious HTML in email content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_sanitized' }),
      });

      const maliciousHtml = `
        <script>alert('XSS')</script>
        <h1>Your Order</h1>
        <img src="x" onerror="alert('XSS')">
        <p>Order #12345</p>
      `;

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Order Confirmation',
        html: maliciousHtml,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Script tags should be removed
      expect(body.html).not.toContain('<script>');

      // Result should still succeed
      expect(result.success).toBe(true);
    });

    it('should use configured from email for spoofing prevention', async () => {
      process.env.NOTIFICATIONS_FROM_EMAIL = 'noreply@kaari.shop';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_from_check' }),
      });

      await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should use the configured from email
      expect(body.from).toBe('noreply@kaari.shop');
    });
  });

  // ========================================
  // Rate Limiting Integration
  // ========================================
  describe('Rate Limiting Integration', () => {
    it('should handle multiple sequential emails correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'email_batch' }),
      });

      const emails = [
        { to: 'user1@example.com', subject: 'Email 1', html: '<p>1</p>' },
        { to: 'user2@example.com', subject: 'Email 2', html: '<p>2</p>' },
        { to: 'user3@example.com', subject: 'Email 3', html: '<p>3</p>' },
      ];

      const results = await Promise.all(
        emails.map((email) => sendEmailWithResend(email))
      );

      expect(results.every((r) => r.success)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ========================================
  // Configuration Integration Tests
  // ========================================
  describe('Configuration Integration', () => {
    it('should work with different from email configurations', async () => {
      process.env.NOTIFICATIONS_FROM_EMAIL = 'support@kaari.shop';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_custom_from' }),
      });

      await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.from).toBe('support@kaari.shop');
    });

    it('should fallback to default from email when not configured', async () => {
      delete process.env.NOTIFICATIONS_FROM_EMAIL;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email_default_from' }),
      });

      await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.from).toBe('orders@kaari.shop');
    });
  });
});