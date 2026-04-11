/**
 * Integration Tests for /api/social-order-intent endpoint
 *
 * Tests for:
 * - POST /api/social-order-intent (log social order intent)
 *
 * Following TDD methodology:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implementation to pass tests
 * 3. REFACTOR: Clean up and optimize
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Types
interface SocialOrderIntentBody {
  eventType: 'social_order_intent';
  channel: 'instagram_dm' | 'whatsapp' | 'copy_link' | 'native_share' | 'card_share';
  productSlug: string;
  productTitle: string;
  productPrice: number;
  category?: string | null;
  sourcePage: string;
  campaign?: string;
  timestamp: string;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  code?: string;
  detail?: string;
  details?: Record<string, string[]>;
}

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock sanitization
vi.mock('@/lib/sanitization', () => ({
  sanitizeTextInput: vi.fn((input: string) => input.trim()),
}));

// Import after mocking
import { POST } from '@/app/api/social-order-intent/route';

describe('POST /api/social-order-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('accepts valid social order intent with all fields', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'handmade-crochet-blanket',
        productTitle: 'Handmade Crochet Blanket',
        productPrice: 2999,
        category: 'blankets',
        sourcePage: '/products/handmade-crochet-blanket',
        campaign: 'instagram-dm-orders',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts valid social order intent for whatsapp channel', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'whatsapp',
        productSlug: 'crochet-hat',
        productTitle: 'Crochet Hat',
        productPrice: 599,
        sourcePage: '/products/crochet-hat',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts valid social order intent for copy_link channel', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'copy_link',
        productSlug: 'knitted-scarf',
        productTitle: 'Knitted Scarf',
        productPrice: 899,
        sourcePage: '/products/knitted-scarf',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts valid social order intent for native_share channel', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'native_share',
        productSlug: 'baby-booties',
        productTitle: 'Baby Booties',
        productPrice: 499,
        sourcePage: '/products/baby-booties',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts valid social order intent for card_share channel', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'card_share',
        productSlug: 'crochet-bag',
        productTitle: 'Crochet Bag',
        productPrice: 1299,
        sourcePage: '/products/crochet-bag',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts request without optional fields', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'minimal-product',
        productTitle: 'Minimal Product',
        productPrice: 100,
        sourcePage: '/products/minimal-product',
        timestamp: '2024-01-15T10:00:00Z',
        // No category or campaign
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('accepts request without timestamp (uses current time)', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'whatsapp',
        productSlug: 'no-timestamp-product',
        productTitle: 'No Timestamp Product',
        productPrice: 500,
        sourcePage: '/products/no-timestamp-product',
        // No timestamp
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles price as zero', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'free-sample',
        productTitle: 'Free Sample',
        productPrice: 0,
        sourcePage: '/products/free-sample',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });
  });

  describe('Validation errors', () => {
    it('returns 400 when eventType is invalid', async () => {
      const requestBody = {
        eventType: 'invalid_event_type',
        channel: 'instagram_dm',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when eventType is missing', async () => {
      const requestBody = {
        channel: 'instagram_dm',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when channel is invalid', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'invalid_channel',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when channel is missing', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when productSlug is missing', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productTitle: 'Product Title',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when productTitle is missing', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'product-slug',
        productPrice: 999,
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when productPrice is missing', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when productPrice is not a number', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'product-slug',
        productTitle: 'Product Title',
        productPrice: 'not-a-number',
        sourcePage: '/products/product-slug',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error handling', () => {
    it('returns 400 when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: 'not valid json',
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('returns 400 when request body is empty', async () => {
      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 400 when request body is null', async () => {
      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: 'null',
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Edge cases', () => {
    it('handles negative price (normalizes to 0)', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'negative-price-product',
        productTitle: 'Negative Price Product',
        productPrice: -100,
        sourcePage: '/products/negative-price-product',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles very long product title (sanitized)', async () => {
      const longTitle = 'A'.repeat(500);
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'long-title-product',
        productTitle: longTitle,
        productPrice: 999,
        sourcePage: '/products/long-title-product',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles special characters in product slug (sanitized)', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'product-with-special-chars-<script>',
        productTitle: 'Product with Special Characters',
        productPrice: 999,
        sourcePage: '/products/product-with-special-chars',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles empty string for optional category', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        category: '',
        sourcePage: '/products/test-product',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles default sourcePage when not provided', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        timestamp: '2024-01-15T10:00:00Z',
        // sourcePage not provided - should default to '/'
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });

    it('handles default campaign when not provided', async () => {
      const requestBody: SocialOrderIntentBody = {
        eventType: 'social_order_intent',
        channel: 'instagram_dm',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        sourcePage: '/products/test-product',
        timestamp: '2024-01-15T10:00:00Z',
        // campaign not provided - should use default
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(202);
      expect(data.success).toBe(true);
    });
  });

  describe('Channel validation', () => {
    const validChannels = ['instagram_dm', 'whatsapp', 'copy_link', 'native_share', 'card_share'];

    validChannels.forEach((channel) => {
      it(`accepts valid channel: ${channel}`, async () => {
        const requestBody: SocialOrderIntentBody = {
          eventType: 'social_order_intent',
          channel: channel as SocialOrderIntentBody['channel'],
          productSlug: 'test-product',
          productTitle: 'Test Product',
          productPrice: 999,
          sourcePage: '/products/test-product',
          timestamp: '2024-01-15T10:00:00Z',
        };

        const request = new NextRequest('http://localhost/api/social-order-intent', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        const response = await POST(request);
        const data: ApiResponse = await response.json();

        expect(response.status).toBe(202);
        expect(data.success).toBe(true);
      });
    });

    it('rejects invalid channel: email', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'email',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        sourcePage: '/products/test-product',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid channel: facebook', async () => {
      const requestBody = {
        eventType: 'social_order_intent',
        channel: 'facebook',
        productSlug: 'test-product',
        productTitle: 'Test Product',
        productPrice: 999,
        sourcePage: '/products/test-product',
        timestamp: '2024-01-15T10:00:00Z',
      };

      const request = new NextRequest('http://localhost/api/social-order-intent', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});