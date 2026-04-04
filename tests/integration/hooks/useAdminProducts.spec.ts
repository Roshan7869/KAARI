/**
 * Integration Tests for hooks/useAdminProducts.ts
 *
 * Tests for React Query hooks managing product CRUD operations.
 * Target coverage: 80%
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Supabase client
const mockQueryBuilder = () => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
  };
  return builder;
};

let queryBuilder: ReturnType<typeof mockQueryBuilder> & { _table?: string };

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      queryBuilder._table = table;
      return queryBuilder;
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      }),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useAdminProducts,
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useUploadProductMedia,
  useDeleteProductMedia,
  useReorderProductMedia,
  useProductCategories,
} from '@/hooks/useAdminProducts';

// ============================================
// Test Utilities
// ============================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ============================================
// Tests: useAdminProducts
// ============================================

describe('useAdminProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('product listing', () => {
    it('fetches products with default parameters', async () => {
      const mockProducts = [
        { id: '1', title: 'Product 1', variants: [{ count: 2 }], media: [{ count: 3 }] },
        { id: '2', title: 'Product 2', variants: [{ count: 1 }], media: [{ count: 5 }] },
      ];

      queryBuilder.select.mockReturnValue({
        ...queryBuilder,
        count: 'exact',
      });
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: mockProducts,
          error: null,
          count: 2,
        })
      );

      const { result } = renderHook(() => useAdminProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.products).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('applies search filter correctly', async () => {
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.or.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: [{ id: '1', title: 'Matching Product', variants: [], media: [] }],
          error: null,
          count: 1,
        })
      );

      const { result } = renderHook(() => useAdminProducts({ search: 'test query' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Search should be sanitized and used in ilike filter
      expect(queryBuilder.or).toHaveBeenCalled();
    });

    it('applies category filter correctly', async () => {
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.eq.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: 0,
        })
      );

      const { result } = renderHook(() => useAdminProducts({ category: 'scarves' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('category', 'scarves');
    });

    it('applies active status filter', async () => {
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.eq.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: 0,
        })
      );

      const { result } = renderHook(() => useAdminProducts({ isActive: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('applies pagination correctly', async () => {
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: 100,
        })
      );

      const { result } = renderHook(() => useAdminProducts({ page: 3, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Page 3 with limit 10 = range(20, 29)
      expect(queryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it('handles database errors gracefully', async () => {
      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' },
          count: null,
        })
      );

      const { result } = renderHook(() => useAdminProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('data transformation', () => {
    it('transforms product counts correctly', async () => {
      const mockProducts = [
        {
          id: '1',
          title: 'Product 1',
          variants: [{ count: 5 }],
          media: [{ count: 10 }],
        },
      ];

      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: mockProducts,
          error: null,
          count: 1,
        })
      );

      const { result } = renderHook(() => useAdminProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.products[0].variant_count).toBe(5);
      expect(result.current.data?.products[0].media_count).toBe(10);
    });

    it('handles missing counts gracefully', async () => {
      const mockProducts = [
        {
          id: '1',
          title: 'Product 1',
          variants: [],
          media: [],
        },
      ];

      queryBuilder.select.mockImplementation(() => queryBuilder);
      queryBuilder.order.mockImplementation(() => queryBuilder);
      queryBuilder.range.mockImplementation(() =>
        Promise.resolve({
          data: mockProducts,
          error: null,
          count: 1,
        })
      );

      const { result } = renderHook(() => useAdminProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.products[0].variant_count).toBe(0);
      expect(result.current.data?.products[0].media_count).toBe(0);
    });
  });
});

// ============================================
// Tests: useAdminProduct
// ============================================

describe('useAdminProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('fetches product with variants and media', async () => {
    const mockProduct = { id: '1', title: 'Test Product', price: 100 };
    const mockVariants = [{ id: 'v1', sku: 'SKU-1' }];
    const mockMedia = [{ id: 'm1', file_path: 'image.jpg' }];

    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.eq.mockImplementation(() => queryBuilder);
    queryBuilder.order.mockImplementation(() => queryBuilder);
    queryBuilder.single.mockImplementation(() =>
      Promise.resolve({ data: mockProduct, error: null })
    );

    // Mock the parallel queries
    let callCount = 0;
    const originalPromise = queryBuilder.select;
    queryBuilder.select = vi.fn().mockImplementation(() => {
      callCount++;
      return queryBuilder;
    });

    // Need to mock Promise.all behavior
    const { supabase } = await import('@/lib/supabase/client');

    vi.spyOn(supabase, 'from').mockImplementation(() => queryBuilder);

    queryBuilder.single = vi.fn().mockResolvedValue({ data: mockProduct, error: null });
    queryBuilder.order = vi.fn().mockReturnThis();

    const { result } = renderHook(() => useAdminProduct('product-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('returns undefined when productId is undefined', async () => {
    const { result } = renderHook(() => useAdminProduct(undefined), {
      wrapper: createWrapper(),
    });

    // Wait for the component to settle
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });

    // When query is disabled (productId is undefined), data is undefined not null
    expect(result.current.data).toBeUndefined();
  });

  it('handles product not found error', async () => {
    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.eq.mockImplementation(() => queryBuilder);
    queryBuilder.single.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      })
    );

    const { result } = renderHook(() => useAdminProduct('nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================
// Tests: useCreateProduct
// ============================================

describe('useCreateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('creates product successfully', async () => {
    const newProduct = {
      title: 'New Product',
      base_price: 500,
      product_type: 'physical' as const,
      slug: 'new-product',
      currency: 'INR'
    };
    const createdProduct = { id: 'new-id', ...newProduct };

    queryBuilder.insert.mockImplementation(() => queryBuilder);
    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.single.mockImplementation(() =>
      Promise.resolve({ data: createdProduct, error: null })
    );

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(newProduct);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(createdProduct);
  });

  it('handles creation error', async () => {
    const newProduct = {
      title: 'New Product',
      base_price: 500,
      product_type: 'physical' as const,
      slug: 'new-product',
      currency: 'INR'
    };

    queryBuilder.insert.mockImplementation(() => queryBuilder);
    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.single.mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: { message: 'Insert failed' },
      })
    );

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(newProduct);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// ============================================
// Tests: useUpdateProduct
// ============================================

describe('useUpdateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('updates product successfully', async () => {
    const updateData = { id: 'product-1', title: 'Updated Title' };
    const updatedProduct = { ...updateData, updated_at: expect.any(String) };

    queryBuilder.update.mockImplementation(() => queryBuilder);
    queryBuilder.eq.mockImplementation(() => queryBuilder);
    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.single.mockImplementation(() =>
      Promise.resolve({ data: updatedProduct, error: null })
    );

    const { result } = renderHook(() => useUpdateProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(updateData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

// ============================================
// Tests: useDeleteProduct
// ============================================

describe('useDeleteProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('soft deletes product by setting is_active to false', async () => {
    queryBuilder.update.mockImplementation(() => queryBuilder);
    queryBuilder.eq.mockImplementation(() =>
      Promise.resolve({ error: null })
    );

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('product-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: false,
        deleted_at: expect.any(String),
      })
    );
  });
});

// ============================================
// Tests: useProductCategories
// ============================================

describe('useProductCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = mockQueryBuilder();
  });

  it('fetches unique categories', async () => {
    const mockProducts = [
      { category: 'scarves' },
      { category: 'hats' },
      { category: 'scarves' },
      { category: 'bags' },
      { category: null },
    ];

    queryBuilder.select.mockImplementation(() => queryBuilder);
    queryBuilder.not.mockImplementation(() => queryBuilder);

    const { supabase } = await import('@/lib/supabase/client');
    vi.spyOn(supabase, 'from').mockImplementation(() => queryBuilder);

    // The query resolves data
    Object.defineProperty(queryBuilder, 'then', {
      value: (resolve: (value: unknown) => void) =>
        resolve({ data: mockProducts, error: null }),
    });

    const { result } = renderHook(() => useProductCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Categories should be unique and filtered
    const categories = result.current.data;
    expect(categories).toContain('scarves');
    expect(categories).toContain('hats');
    expect(categories).toContain('bags');
    expect(categories).not.toContain(null);
  });
});