/**
 * Integration Tests for /api/reviews endpoint
 *
 * Tests for:
 * - GET /api/reviews (list reviews with pagination and sorting)
 * - POST /api/reviews (create new review)
 *
 * Following TDD methodology:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implementation to pass tests
 * 3. REFACTOR: Clean up and optimize
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Types
interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  helpful_count: number;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  approved_at: string | null;
}

interface ReviewWithUser extends Review {
  user: {
    id: string;
    full_name: string | null;
  } | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Mock user data - valid UUIDs matching schema requirements
const mockUserId = '12345678-1234-1234-1234-123456789abc';
const mockProductId = '11111111-1111-1111-1111-111111111111';
const mockOrderId = '22222222-2222-2222-2222-222222222222';

// Mock review data
const mockReview: Review = {
  id: 'review-1234-5678-9abc-def012345678',
  product_id: mockProductId,
  user_id: mockUserId,
  order_id: null,
  rating: 5,
  title: 'Great product!',
  content: 'This is an excellent product. Highly recommended.',
  status: 'approved',
  helpful_count: 10,
  is_verified_purchase: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  deleted_at: null,
  approved_at: '2024-01-15T10:00:00Z',
};

const mockReviewWithUser: ReviewWithUser = {
  ...mockReview,
  user: {
    id: mockUserId,
    full_name: 'Test User',
  },
};

// Global mock functions - initialized immediately with vi.fn()
// These must be initialized before vi.mock() is hoisted
const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();

// Mock the server client - must return a Promise since createClient is async
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockAuthGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock sanitization
vi.mock('@/lib/sanitization', () => ({
  sanitizeTextInput: vi.fn((input: string) => input.trim()),
}));

// Import after mocking
import { GET, POST } from '@/app/api/reviews/route';

describe('GET /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations for each test
    mockAuthGetUser.mockReset();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('returns reviews for a valid product_id', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      // Setup chainable mock for count query
      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      });

      // Setup chainable mock for data query
      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        // First call is count, second is data
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}`);
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<ReviewWithUser[]> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('returns pagination metadata with reviews', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 15 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&page=2&limit=5`);
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<ReviewWithUser[]> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meta).toBeDefined();
    });

    it('sorts reviews by newest (default)', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('sorts reviews by highest rating', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&sort_by=highest`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('sorts reviews by lowest rating', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&sort_by=lowest`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('sorts reviews by helpful count', async () => {
      const mockReviews: ReviewWithUser[] = [mockReviewWithUser];

      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&sort_by=helpful`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error cases', () => {
    it('returns 400 when product_id is missing', async () => {
      const url = new URL('http://localhost/api/reviews');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('product_id is required');
    });

    it('returns 400 when product_id has invalid format', async () => {
      const url = new URL('http://localhost/api/reviews?product_id=invalid-uuid');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid product_id format');
    });

    it('returns 400 when sort_by has invalid value', async () => {
      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&sort_by=invalid`);
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid sort_by');
    });

    it('returns 500 when database query fails', async () => {
      const createErrorChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' }, count: null }),
      });

      mockFrom.mockImplementation(() => createErrorChain());

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}`);
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('returns empty array when no reviews exist', async () => {
      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}`);
      const request = new NextRequest(url);

      const response = await GET(request);
      const data: ApiResponse<ReviewWithUser[]> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('handles pagination with page parameter', async () => {
      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&page=3`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('limits page size to maximum of 100', async () => {
      const createCountChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
      });

      const createDataChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? createCountChain() : createDataChain();
      });

      const url = new URL(`http://localhost/api/reviews?product_id=${mockProductId}&limit=200`);
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockReset();
    mockFrom.mockReset();
  });

  describe('Success cases', () => {
    it('creates a new review with valid data', async () => {
      // Mock authenticated user
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock for existing review check and insert
      const createChain = () => {
        let singleCallCount = 0;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            singleCallCount++;
            // First call: existing review check
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          }),
          insert: vi.fn().mockReturnThis(),
        };
      };

      const chain = createChain();
      // Override insert chain
      (chain.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockReview, status: 'pending' },
            error: null,
          }),
        }),
      });

      mockFrom.mockImplementation(() => chain);

      const requestBody = {
        product_id: mockProductId,
        rating: 5,
        title: 'Great product!',
        content: 'This is an excellent product. Highly recommended.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<Review> = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('creates a review with order_id for verified purchase', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      let singleCallCount = 0;

      const createChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          singleCallCount++;
          // First call: order check
          if (singleCallCount === 1) {
            return Promise.resolve({ data: { id: mockOrderId, status: 'delivered' }, error: null });
          }
          // Second call: order item check
          if (singleCallCount === 2) {
            return Promise.resolve({ data: { id: 'order-item-123' }, error: null });
          }
          // Third call: existing review check
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...mockReview, order_id: mockOrderId },
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockImplementation(() => createChain());

      const requestBody = {
        product_id: mockProductId,
        order_id: mockOrderId,
        rating: 5,
        title: 'Great product!',
        content: 'Verified purchase review.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('Authentication errors', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const requestBody = {
        product_id: mockProductId,
        rating: 5,
        title: 'Test',
        content: 'Test content here.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 401 when auth token is invalid', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const requestBody = {
        product_id: mockProductId,
        rating: 5,
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('returns 400 when product_id is missing', async () => {
      const requestBody = {
        rating: 5,
        title: 'Test',
        content: 'Test content.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 when rating is invalid (below 1)', async () => {
      const requestBody = {
        product_id: mockProductId,
        rating: 0,
        title: 'Test',
        content: 'Test content.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when rating is invalid (above 5)', async () => {
      const requestBody = {
        product_id: mockProductId,
        rating: 6,
        title: 'Test',
        content: 'Test content.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when product_id has invalid format', async () => {
      const requestBody = {
        product_id: 'invalid-uuid',
        rating: 5,
        title: 'Test',
        content: 'Test content.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('returns 400 when order_id has invalid format', async () => {
      const requestBody = {
        product_id: mockProductId,
        order_id: 'invalid-uuid',
        rating: 5,
        title: 'Test',
        content: 'Test content.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid order_id format');
    });

    it('returns 400 when title is too short (after sanitization)', async () => {
      const requestBody = {
        product_id: mockProductId,
        rating: 5,
        title: 'AB', // Too short after sanitization (min 3 chars)
        content: 'Test content here.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('title must be at least 3 characters');
    });

    it('returns 400 when content is too short (after sanitization)', async () => {
      const requestBody = {
        product_id: mockProductId,
        rating: 5,
        title: 'Test Title',
        content: 'Short', // Too short after sanitization (min 10 chars)
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('content must be at least 10 characters');
    });
  });

  describe('Business logic errors', () => {
    beforeEach(() => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('returns 403 when order does not belong to user', async () => {
      const createChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      mockFrom.mockImplementation(() => createChain());

      const requestBody = {
        product_id: mockProductId,
        order_id: mockOrderId,
        rating: 5,
        title: 'Test',
        content: 'Test content here.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Order not found or does not belong to you');
    });

    it('returns 409 when user has already reviewed the product', async () => {
      const createChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'existing-review-123' }, error: null }),
      });

      mockFrom.mockImplementation(() => createChain());

      const requestBody = {
        product_id: mockProductId,
        rating: 5,
        title: 'Test',
        content: 'Test content here.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already reviewed');
    });

    it('returns 400 when product not found in order', async () => {
      let singleCallCount = 0;

      const createChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          singleCallCount++;
          // First call: order check - succeeds
          if (singleCallCount === 1) {
            return Promise.resolve({ data: { id: mockOrderId, status: 'delivered' }, error: null });
          }
          // Second call: order item check - product not in order
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }),
      });

      mockFrom.mockImplementation(() => createChain());

      const requestBody = {
        product_id: mockProductId,
        order_id: mockOrderId,
        rating: 5,
        title: 'Test',
        content: 'Test content here.',
      };

      const request = new NextRequest('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Product not found in the specified order');
    });
  });
});