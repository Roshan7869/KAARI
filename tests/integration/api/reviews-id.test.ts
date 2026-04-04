/**
 * Integration Tests for /api/reviews/[id] endpoint
 *
 * Tests for:
 * - GET /api/reviews/[id] (get single review)
 * - PATCH /api/reviews/[id] (update review)
 * - DELETE /api/reviews/[id] (soft delete review)
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
}

// Mock types for Supabase query builder
interface MockQuery {
  select: vi.Mock;
  eq: vi.Mock;
  single: vi.Mock;
  is: vi.Mock;
  update?: vi.Mock;
}

interface MockSupabaseClient {
  auth: {
    getUser: vi.Mock;
  };
  from: vi.Mock;
}

// Mock data - valid UUIDs
const mockUserId = '12345678-1234-1234-1234-123456789abc';
const mockAdminUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const mockOtherUserId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const mockReviewId = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
const mockProductId = 'd4e5f6a7-b8c9-0123-defa-234567890123';
const mockOrderId = 'e5f6a7b8-c9d0-1234-efab-345678901234';

const mockReview: Review = {
  id: mockReviewId,
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

const mockPendingReviewId = 'd4e5f6a7-b8c9-0123-defa-234567890124';
const mockPendingReview: Review = {
  ...mockReview,
  id: mockPendingReviewId,
  status: 'pending',
  approved_at: null,
};

// Global mock functions - initialized immediately with vi.fn()
// These must be initialized before vi.mock() is hoisted
let mockAuthGetUser = vi.fn();
let mockFrom = vi.fn();

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
import { GET, PATCH, DELETE } from '@/app/api/reviews/[id]/route';

// Helper to create route params
const createParams = (id: string) => Promise.resolve({ id });

describe('GET /api/reviews/[id]', () => {
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
    it('returns a review by ID for approved review (public access)', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockReviewWithUser,
          error: null,
        }),
      }));

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`);
      const params = createParams(mockReviewId);

      const response = await GET(request, { params });
      const data: ApiResponse<ReviewWithUser> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data?.id).toBe(mockReviewId);
    });

    it('returns pending review to review owner', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Track from() calls by table name
      const mockFromImpl = (table: string) => {
        const mockQuery: MockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis(),
        };

        if (table === 'product_reviews') {
          // Review fetch - returns pending review with matching user_id
          mockQuery.single.mockResolvedValueOnce({
            data: {
              ...mockPendingReview,
              user_id: mockUserId,
              id: mockPendingReviewId,
            },
            error: null,
          });
        } else {
          // User roles check - returns null (not admin)
          mockQuery.single.mockResolvedValueOnce({
            data: null,
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const request = new NextRequest(`http://localhost/api/reviews/${mockPendingReviewId}`);
      const params = createParams(mockPendingReviewId);

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it('returns pending review to admin user', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      const mockFromImpl = (table: string) => {
        const mockQuery: MockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis(),
        };

        if (table === 'product_reviews') {
          // Review fetch
          mockQuery.single.mockResolvedValueOnce({
            data: { ...mockPendingReview },
            error: null,
          });
        } else {
          // User roles check - returns admin role
          mockQuery.single.mockResolvedValueOnce({
            data: { role: 'admin' },
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const request = new NextRequest(`http://localhost/api/reviews/${mockPendingReviewId}`);
      const params = createParams(mockPendingReviewId);

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Error cases', () => {
    it('returns 400 when review ID has invalid format', async () => {
      const request = new NextRequest('http://localhost/api/reviews/invalid-uuid');
      const params = createParams('invalid-uuid');

      const response = await GET(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid review ID format');
    });

    it('returns 404 when review does not exist', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }));

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`);
      const params = createParams(mockReviewId);

      const response = await GET(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Review not found');
    });

    it('returns 404 when review is deleted (soft delete)', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockFromImpl = (table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      mockFrom.mockImplementation(mockFromImpl);

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`);
      const params = createParams(mockReviewId);

      const response = await GET(request, { params });

      expect(response.status).toBe(404);
    });

    it('returns 404 when non-owner/non-admin tries to view pending review', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockOtherUserId } },
        error: null,
      });

      const mockFromImpl = (table: string) => {
        const mockQuery: MockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis(),
        };

        if (table === 'product_reviews') {
          // Review fetch - returns pending review for another user
          mockQuery.single.mockResolvedValueOnce({
            data: { ...mockPendingReview, status: 'pending', user_id: mockUserId },
            error: null,
          });
        } else {
          // User roles check - returns null (not admin)
          mockQuery.single.mockResolvedValueOnce({
            data: null,
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const request = new NextRequest(`http://localhost/api/reviews/${mockPendingReviewId}`);
      const params = createParams(mockPendingReviewId);

      const response = await GET(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Review not found');
    });
  });
});

describe('PATCH /api/reviews/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('allows owner to update rating', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock review fetch and update
      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: mockReview,
          error: null,
        });

        // Admin check (not admin)
        mockQuery.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

        // Update
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockReview, rating: 4 },
                error: null,
              }),
            }),
          }),
        });

        return mockQuery;
      });

      const requestBody = { rating: 4 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
    });

    it('allows owner to update title and content', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: mockReview,
          error: null,
        });

        // Admin check
        mockQuery.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

        // Update
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockReview, title: 'Updated title', content: 'Updated content' },
                error: null,
              }),
            }),
          }),
        });

        return mockQuery;
      });

      const requestBody = { title: 'Updated title', content: 'Updated content here.' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
    });

    it('allows admin to update status to approved', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: mockPendingReview,
          error: null,
        });

        // Admin check (is admin)
        mockQuery.single.mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

        // Update
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockPendingReview, status: 'approved', approved_at: '2024-01-16T10:00:00Z' },
                error: null,
              }),
            }),
          }),
        });

        return mockQuery;
      });

      const requestBody = { status: 'approved' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
    });

    it('allows admin to update status to rejected', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: mockPendingReview,
          error: null,
        });

        // Admin check
        mockQuery.single.mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

        // Update
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockPendingReview, status: 'rejected' },
                error: null,
              }),
            }),
          }),
        });

        return mockQuery;
      });

      const requestBody = { status: 'rejected' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Authentication errors', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const requestBody = { rating: 4 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization errors', () => {
    beforeEach(() => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockOtherUserId } },
        error: null,
      });
    });

    it('returns 403 when non-owner tries to update review', async () => {
      const mockFromImpl = (table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
        } as const;

        if (table === 'product_reviews') {
          // Review fetch
          mockQuery.single.mockResolvedValueOnce({
            data: { ...mockReview, user_id: mockUserId },
            error: null,
          });
        } else {
          // User roles check - returns null (not admin)
          mockQuery.single.mockResolvedValueOnce({
            data: null,
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const requestBody = { rating: 4 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You can only update your own reviews');
    });

    it('returns 403 when non-admin tries to update status', async () => {
      const mockFromImpl = (table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
        } as const;

        if (table === 'product_reviews') {
          // Review fetch (owned by other user)
          mockQuery.single.mockResolvedValueOnce({
            data: { ...mockReview, user_id: mockOtherUserId },
            error: null,
          });
        } else {
          // User roles check - returns null (not admin)
          mockQuery.single.mockResolvedValueOnce({
            data: null,
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const requestBody = { status: 'approved' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only admins can update review status');
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock review fetch for owner
      mockFrom.mockImplementation(() => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
        } as const;

        mockQuery.single.mockResolvedValueOnce({
          data: mockReview,
          error: null,
        });

        mockQuery.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

        return mockQuery;
      });
    });

    it('returns 400 when review ID has invalid format', async () => {
      const requestBody = { rating: 4 };
      const request = new NextRequest('http://localhost/api/reviews/invalid-uuid', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams('invalid-uuid');

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid review ID format');
    });

    it('returns 400 when rating is invalid (below 1)', async () => {
      const requestBody = { rating: 0 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('rating must be an integer between 1 and 5');
    });

    it('returns 400 when rating is invalid (above 5)', async () => {
      const requestBody = { rating: 6 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });

      expect(response.status).toBe(400);
    });

    it('returns 400 when title is too short', async () => {
      const requestBody = { title: 'AB' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('title must be at least 3 characters');
    });

    it('returns 400 when content is too short', async () => {
      const requestBody = { content: 'short' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('content must be at least 10 characters');
    });

    it('returns 400 when status is invalid', async () => {
      // Override for admin
      mockFrom.mockImplementation(() => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
        } as const;

        mockQuery.single.mockResolvedValueOnce({
          data: mockReview,
          error: null,
        });

        // Admin check
        mockQuery.single.mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

        return mockQuery;
      });

      const requestBody = { status: 'invalid_status' };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid status');
    });

    it('returns 400 when no valid fields to update', async () => {
      const requestBody = {};
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No valid fields to update');
    });
  });

  describe('Not found errors', () => {
    beforeEach(() => {
      // Initialize mock functions fresh for each test
      mockAuthGetUser = vi.fn();
      mockFrom = vi.fn();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('returns 404 when review does not exist', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }));

      const requestBody = { rating: 4 };
      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
      const params = createParams(mockReviewId);

      const response = await PATCH(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Review not found');
    });
  });
});

describe('DELETE /api/reviews/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('allows owner to soft delete their review', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: mockReview,
          error: null,
        });

        // Admin check (not admin)
        mockQuery.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

        // Soft delete
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

        return mockQuery;
      });

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
    });

    it('allows admin to soft delete any review', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      });

      mockFrom.mockImplementation(() => {
        const mockQuery: MockQuery & { update?: vi.Mock } = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
        };

        // Review fetch
        mockQuery.single.mockResolvedValueOnce({
          data: { ...mockReview, user_id: mockOtherUserId },
          error: null,
        });

        // Admin check (is admin)
        mockQuery.single.mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

        // Soft delete
        mockQuery.update.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

        return mockQuery;
      });

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Authentication errors', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization errors', () => {
    beforeEach(() => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockOtherUserId } },
        error: null,
      });
    });

    it('returns 403 when non-owner non-admin tries to delete', async () => {
      const mockFromImpl = (table: string) => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn(),
        } as const;

        if (table === 'product_reviews') {
          // Review fetch
          mockQuery.single.mockResolvedValueOnce({
            data: { ...mockReview, user_id: mockUserId },
            error: null,
          });
        } else {
          // User roles check - returns null (not admin)
          mockQuery.single.mockResolvedValueOnce({
            data: null,
            error: null,
          });
        }

        return mockQuery;
      };

      mockFrom.mockImplementation(mockFromImpl);

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You can only delete your own reviews');
    });
  });

  describe('Validation errors', () => {
    beforeEach(() => {
      // Initialize mock functions fresh for each test
      mockAuthGetUser = vi.fn();
      mockFrom = vi.fn();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('returns 400 when review ID has invalid format', async () => {
      const request = new NextRequest('http://localhost/api/reviews/invalid-uuid', {
        method: 'DELETE',
      });
      const params = createParams('invalid-uuid');

      const response = await DELETE(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid review ID format');
    });
  });

  describe('Not found errors', () => {
    beforeEach(() => {
      // Initialize mock functions fresh for each test
      mockAuthGetUser = vi.fn();
      mockFrom = vi.fn();
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });
    });

    it('returns 404 when review does not exist', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }));

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });
      const data: ApiResponse<null> = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Review not found');
    });

    it('returns 404 when review is already deleted', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }));

      const request = new NextRequest(`http://localhost/api/reviews/${mockReviewId}`, {
        method: 'DELETE',
      });
      const params = createParams(mockReviewId);

      const response = await DELETE(request, { params });

      expect(response.status).toBe(404);
    });
  });
});