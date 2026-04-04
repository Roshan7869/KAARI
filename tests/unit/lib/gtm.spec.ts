/**
 * Unit Tests for lib/gtm.ts
 *
 * Tests for Google Tag Manager integration.
 * Target coverage: 80%
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('gtm', () => {
  let mockDataLayer: Record<string, unknown>[];
  let mockGtag: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataLayer = [];
    mockGtag = vi.fn();

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        dataLayer: mockDataLayer,
        gtag: mockGtag,
        document: {
          head: {
            appendChild: vi.fn(),
          },
          createElement: vi.fn().mockReturnValue({
            async: false,
            src: '',
          }),
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initGTM', () => {
    it('initializes data layer', async () => {
      const { initGTM } = await import('@/lib/gtm');

      initGTM('G-XXXXXXXXXX');

      expect(window.dataLayer).toBeDefined();
    });

    it('injects GTM script', async () => {
      const { initGTM } = await import('@/lib/gtm');

      // Create mock script element
      const mockScript = { async: false, src: '' };
      const mockAppendChild = vi.fn();
      const mockCreateElement = vi.fn().mockReturnValue(mockScript);

      // Replace document methods
      const originalCreateElement = document.createElement;
      const originalAppendChild = document.head.appendChild;

      document.createElement = mockCreateElement as unknown as typeof document.createElement;
      document.head.appendChild = mockAppendChild;

      initGTM('G-TEST123456');

      // Restore original methods
      document.createElement = originalCreateElement;
      document.head.appendChild = originalAppendChild;

      expect(mockCreateElement).toHaveBeenCalledWith('script');
      expect(mockAppendChild).toHaveBeenCalledWith(mockScript);
    });

    it('does nothing in SSR context', async () => {
      // Mock SSR by removing window
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const { initGTM } = await import('@/lib/gtm');

      // Should not throw
      expect(() => initGTM('G-TEST123456')).not.toThrow();
    });
  });

  describe('trackEvent', () => {
    it('tracks custom events', async () => {
      const { trackEvent } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackEvent('button_click', { button_id: 'submit' });

      expect(window.gtag).toHaveBeenCalledWith('event', 'button_click', { button_id: 'submit' });
    });

    it('handles missing gtag gracefully', async () => {
      const { trackEvent } = await import('@/lib/gtm');

      window.gtag = undefined as unknown as typeof window.gtag;

      // Should not throw
      expect(() => trackEvent('event', {})).not.toThrow();
    });

    it('does nothing in SSR context', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const { trackEvent } = await import('@/lib/gtm');

      // Should not throw
      expect(() => trackEvent('event', {})).not.toThrow();
    });

    it('handles event data with various types', async () => {
      const { trackEvent } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackEvent('purchase', {
        transaction_id: '123',
        value: 99.99,
        items_count: 5,
        confirmed: true,
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', {
        transaction_id: '123',
        value: 99.99,
        items_count: 5,
        confirmed: true,
      });
    });
  });

  describe('trackPurchase', () => {
    it('tracks purchase event with items', async () => {
      const { trackPurchase } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackPurchase('TXN-123', 1499.99, [
        { item_id: 'prod-1', item_name: 'Product 1', price: 500, quantity: 2 },
        { item_id: 'prod-2', item_name: 'Product 2', price: 499.99, quantity: 1 },
      ]);

      expect(window.gtag).toHaveBeenCalled();
      const call = (window.gtag as Mock).mock.calls[0];
      expect(call[0]).toBe('event');
      expect(call[1]).toBe('purchase');
      expect(call[2]).toMatchObject({
        transaction_id: 'TXN-123',
        value: 1499.99,
        currency: 'INR',
        item_count: 2,
      });
    });

    it('flattens items for GTM', async () => {
      const { trackPurchase } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackPurchase('TXN-456', 100, [
        { item_id: 'sku-1', item_name: 'Test Product', price: 50, quantity: 2 },
      ]);

      const call = (window.gtag as Mock).mock.calls[0];
      const eventData = call[2];

      expect(eventData.item_id_0).toBe('sku-1');
      expect(eventData.item_name_0).toBe('Test Product');
      expect(eventData.item_price_0).toBe(50);
      expect(eventData.item_quantity_0).toBe(2);
    });

    it('handles empty items array', async () => {
      const { trackPurchase } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackPurchase('TXN-789', 0, []);

      const call = (window.gtag as Mock).mock.calls[0];
      expect(call[2].item_count).toBe(0);
    });
  });

  describe('trackPageView', () => {
    it('tracks page view event', async () => {
      const { trackPageView } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      trackPageView('/products/scarves', 'Products - Scarves');

      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/products/scarves',
        page_title: 'Products - Scarves',
      });
    });
  });

  describe('setUserProperties', () => {
    it('sets user properties', async () => {
      const { setUserProperties } = await import('@/lib/gtm');

      window.gtag = vi.fn();

      setUserProperties('user-123', { role: 'admin', subscription: 'premium' });

      expect(window.gtag).toHaveBeenCalledWith('config', 'GA_MEASUREMENT_ID', {
        'user_id': 'user-123',
        role: 'admin',
        subscription: 'premium',
      });
    });

    it('handles missing gtag', async () => {
      const { setUserProperties } = await import('@/lib/gtm');

      window.gtag = undefined as unknown as typeof window.gtag;

      // Should not throw
      expect(() => setUserProperties('user-123', {})).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('catches and logs tracking errors', async () => {
      const { trackEvent } = await import('@/lib/gtm');
      const { logger } = await import('@/lib/logger');

      window.gtag = vi.fn().mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      // Should not throw
      expect(() => trackEvent('test', {})).not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});