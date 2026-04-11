/**
 * Unit Tests for lib/socialAttribution.ts
 *
 * Tests for social attribution tracking.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('socialAttribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildTrackedProductUrl', () => {
    it('builds URL with UTM parameters in SSR context', async () => {
      // Mock SSR (no window)
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', { value: undefined, writable: true });

      const { buildTrackedProductUrl } = await import('@/lib/socialAttribution');

      const url = buildTrackedProductUrl({
        slug: 'test-product',
        source: 'instagram',
        medium: 'social',
        campaign: 'summer-sale',
      });

      expect(url).toContain('utm_source=instagram');
      expect(url).toContain('utm_medium=social');
      expect(url).toContain('utm_campaign=summer-sale');
      expect(url).toContain('/products/test-product');
      expect(url).toContain('kaari.in');

      // Restore window
      Object.defineProperty(global, 'window', { value: originalWindow, writable: true });
    });

    it('builds URL with UTM parameters in browser context', async () => {
      // Mock browser environment
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'https://test.com' } },
        writable: true,
      });

      const { buildTrackedProductUrl } = await import('@/lib/socialAttribution');

      const url = buildTrackedProductUrl({
        slug: 'my-product',
        source: 'whatsapp',
        medium: 'dm',
        campaign: 'share',
      });

      expect(url).toContain('utm_source=whatsapp');
      expect(url).toContain('utm_medium=dm');
      expect(url).toContain('utm_campaign=share');
      expect(url).toContain('/products/my-product');
    });

    it('encodes special characters in UTM parameters', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { origin: 'https://test.com' } },
        writable: true,
      });

      const { buildTrackedProductUrl } = await import('@/lib/socialAttribution');

      const url = buildTrackedProductUrl({
        slug: 'test',
        source: 'instagram dm',
        medium: 'social share',
        campaign: 'summer sale 2024',
      });

      // URLSearchParams uses + for spaces by default
      expect(url).toContain('utm_source=instagram+dm');
      expect(url).toContain('utm_medium=social+share');
      expect(url).toContain('utm_campaign=summer+sale+2024');
      expect(url).toContain('/products/test');
    });
  });

  describe('createDmOrderIntentPayload', () => {
    it('creates payload with required fields', async () => {
      const { createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'instagram_dm',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });

      expect(payload.eventType).toBe('social_order_intent');
      expect(payload.channel).toBe('instagram_dm');
      expect(payload.productSlug).toBe('test-product');
      expect(payload.productTitle).toBe('Test Product');
      expect(payload.productPrice).toBe(999);
      expect(payload.campaign).toBe('instagram-dm-orders');
      expect(payload.timestamp).toBeDefined();
    });

    it('includes optional fields', async () => {
      const { createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'whatsapp',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        category: 'scarves',
        campaign: 'custom-campaign',
      });

      expect(payload.category).toBe('scarves');
      expect(payload.campaign).toBe('custom-campaign');
    });

    it('sets sourcePage from window.location', async () => {
      Object.defineProperty(global, 'window', {
        value: { location: { pathname: '/products/test-product' } },
        writable: true,
      });

      const { createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'copy_link',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });

      expect(payload.sourcePage).toBe('/products/test-product');
    });

    it('sets default sourcePage in SSR context', async () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true });

      const { createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'whatsapp',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });

      expect(payload.sourcePage).toBe('/');
    });
  });

  describe('dispatchDmOrderIntent', () => {
    it('tracks analytics event', async () => {
      const { trackEvent } = await import('@/lib/analytics');
      const { dispatchDmOrderIntent, createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'instagram_dm',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });
      await dispatchDmOrderIntent(payload);

      expect(trackEvent).toHaveBeenCalledWith('social_order_intent', expect.objectContaining({
        channel: 'instagram_dm',
        product_slug: 'test-product',
        product_title: 'Test Product',
        product_price: 999,
      }));
    });

    it('uses sendBeacon when available', async () => {
      const mockSendBeacon = vi.fn().mockReturnValue(true);
      Object.defineProperty(global, 'navigator', {
        value: { sendBeacon: mockSendBeacon },
        writable: true,
      });

      const { dispatchDmOrderIntent, createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'whatsapp',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });
      await dispatchDmOrderIntent(payload);

      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/social-order-intent',
        expect.any(Blob)
      );
    });

    it('falls back to fetch when sendBeacon is not available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });

      const { dispatchDmOrderIntent, createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'copy_link',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });
      await dispatchDmOrderIntent(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/social-order-intent',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        })
      );
    });

    it('handles errors gracefully', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      Object.defineProperty(global, 'fetch', { value: mockFetch, writable: true });

      const { dispatchDmOrderIntent, createDmOrderIntentPayload } = await import('@/lib/socialAttribution');

      const payload = createDmOrderIntentPayload({
        channel: 'whatsapp',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
      });

      // Should not throw
      await expect(dispatchDmOrderIntent(payload)).resolves.toBeUndefined();
    });
  });
});