/**
 * Unit Tests for lib/analytics.ts
 *
 * Tests for analytics tracking.
 * Target coverage: 80%
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('analytics', () => {
  let mockDataLayer: Array<Record<string, unknown>>;
  let mockGtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataLayer = [];
    mockGtag = vi.fn();

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        dataLayer: mockDataLayer,
        gtag: mockGtag,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackEvent', () => {
    it('tracks event with name only', async () => {
      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('button_click');

      expect(window.dataLayer).toHaveLength(1);
      expect(window.dataLayer![0]).toEqual({ event: 'button_click' });
    });

    it('tracks event with params', async () => {
      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('purchase', {
        transaction_id: '123',
        value: 99.99,
        currency: 'INR',
      });

      expect(window.dataLayer).toHaveLength(1);
      expect(window.dataLayer![0]).toEqual({
        event: 'purchase',
        transaction_id: '123',
        value: 99.99,
        currency: 'INR',
      });
    });

    it('calls gtag if available', async () => {
      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('page_view', { page_path: '/products' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/products',
      });
    });

    it('handles missing gtag gracefully', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          dataLayer: mockDataLayer,
          gtag: undefined,
        },
        writable: true,
      });

      const { trackEvent } = await import('@/lib/analytics');

      // Should not throw
      expect(() => trackEvent('test_event')).not.toThrow();
    });

    it('handles SSR (no window)', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
      });

      const { trackEvent } = await import('@/lib/analytics');

      // Should not throw
      expect(() => trackEvent('test_event')).not.toThrow();
    });

    it('initializes dataLayer if not present', async () => {
      Object.defineProperty(global, 'window', {
        value: {
          gtag: mockGtag,
        },
        writable: true,
      });

      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('test_event');

      expect(window.dataLayer).toBeDefined();
      expect(window.dataLayer).toHaveLength(1);
    });

    it('handles various param types', async () => {
      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('test', {
        string_param: 'value',
        number_param: 123,
        boolean_param: true,
        null_param: null,
        undefined_param: undefined,
      });

      expect(window.dataLayer![0]).toEqual({
        event: 'test',
        string_param: 'value',
        number_param: 123,
        boolean_param: true,
        null_param: null,
        undefined_param: undefined,
      });
    });

    it('handles empty params object', async () => {
      const { trackEvent } = await import('@/lib/analytics');

      trackEvent('simple_event', {});

      expect(window.dataLayer![0]).toEqual({ event: 'simple_event' });
    });
  });
});