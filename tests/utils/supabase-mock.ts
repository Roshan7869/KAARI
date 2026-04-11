/**
 * Supabase Client Mock Factory
 *
 * This module provides comprehensive mocking utilities for Supabase client
 * in unit and integration tests. It supports:
 * - Auth methods (getUser, signIn, signOut, etc.)
 * - Database query chain (from().select().eq()...)
 * - RPC functions
 * - Storage methods
 * - Realtime subscriptions
 */

import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

export interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    resetPasswordForEmail: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
  functions: {
    invoke: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
}

export interface MockUser {
  id: string;
  email: string;
  created_at: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: MockUser;
}

// ============================================
// Default Mock Data
// ============================================

export const defaultMockUser: MockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  role: 'customer',
  user_metadata: {
    full_name: 'Test User',
  },
};

export const defaultMockSession: MockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: defaultMockUser,
};

export const defaultMockAdminUser: MockUser = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  created_at: '2024-01-01T00:00:00.000Z',
  role: 'admin',
  user_metadata: {
    full_name: 'Admin User',
  },
};

// ============================================
// Query Builder Mock Factory
// ============================================

/**
 * Creates a mock query builder that supports method chaining.
 * Each method returns the query builder to allow .select().eq().single() chains.
 */
export function createMockQueryBuilder(): MockQueryBuilder {
  const builder: Partial<MockQueryBuilder> = {};

  // Terminal methods that return data
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });

  // Methods that return the builder for chaining
  const chainMethod = () => builder;

  builder.select = vi.fn().mockReturnValue({
    eq: chainMethod,
    neq: chainMethod,
    gt: chainMethod,
    gte: chainMethod,
    lt: chainMethod,
    lte: chainMethod,
    in: chainMethod,
    contains: chainMethod,
    range: chainMethod,
    limit: chainMethod,
    order: chainMethod,
    maybeSingle: builder.maybeSingle,
    single: builder.single,
  });

  builder.insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: builder.single,
    }),
  });

  builder.update = vi.fn().mockReturnValue({
    eq: chainMethod,
    select: vi.fn().mockReturnValue({
      single: builder.single,
    }),
  });

  builder.delete = vi.fn().mockReturnValue({
    eq: chainMethod,
  });

  builder.upsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: builder.single,
    }),
  });

  // Chain methods
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.gt = vi.fn().mockReturnValue(builder);
  builder.gte = vi.fn().mockReturnValue(builder);
  builder.lt = vi.fn().mockReturnValue(builder);
  builder.lte = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.contains = vi.fn().mockReturnValue(builder);
  builder.range = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);

  return builder as MockQueryBuilder;
}

// ============================================
// Supabase Client Mock Factory
// ============================================

export interface CreateMockClientOptions {
  user?: MockUser | null;
  session?: MockSession | null;
  isAdmin?: boolean;
}

/**
 * Creates a fully mocked Supabase client for testing.
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient();
 * vi.mock('@/lib/supabase/client', () => ({
 *   createClient: () => mockClient
 * }));
 * ```
 */
export function createMockSupabaseClient(
  options: CreateMockClientOptions = {}
): MockSupabaseClient {
  const { user = defaultMockUser, session = defaultMockSession, isAdmin = false } = options;

  // Auth methods
  const authMock = {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user, session },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user, session },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
  };

  // Database query builder
  const queryBuilder = createMockQueryBuilder();

  const fromMock = vi.fn().mockReturnValue(queryBuilder);

  // RPC function mock
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

  // Storage mock
  const storageMock = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(),
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/test' },
      }),
    }),
  };

  // Functions mock
  const functionsMock = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  // Realtime mock
  const channelMock = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
    }),
  });

  return {
    auth: authMock,
    from: fromMock,
    rpc: rpcMock,
    storage: storageMock,
    functions: functionsMock,
    channel: channelMock,
  };
}

// ============================================
// Specialized Mock Factories
// ============================================

/**
 * Creates a mock client for authentication tests.
 */
export function createAuthMockClient(options: {
  user?: MockUser | null;
  session?: MockSession | null;
  signInError?: Error;
  signUpError?: Error;
}) {
  const client = createMockSupabaseClient({
    user: options.user ?? null,
    session: options.session ?? null,
  });

  if (options.signInError) {
    client.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: options.signInError.message },
    });
  }

  if (options.signUpError) {
    client.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: options.signUpError.message },
    });
  }

  return client;
}

/**
 * Creates a mock client for cart/checkout tests.
 */
export function createCartMockClient(options: {
  cartData?: Record<string, unknown>[];
  cartItems?: Record<string, unknown>[];
  productId?: string;
  variantId?: string;
  stockQty?: number;
} = {}) {
  const client = createMockSupabaseClient();

  // Mock RPC for cart operations
  client.rpc = vi.fn().mockImplementation((fn: string, params?: Record<string, unknown>) => {
    switch (fn) {
      case 'add_item_to_cart':
        return Promise.resolve({
          data: [{ cart_item_id: 'test-cart-item-id' }],
          error: null,
        });
      case 'set_cart_item_quantity':
        return Promise.resolve({ data: null, error: null });
      case 'create_order_from_cart':
        return Promise.resolve({
          data: { order_id: 'test-order-id' },
          error: null,
        });
      case 'has_role':
        return Promise.resolve({
          data: false,
          error: null,
        });
      default:
        return Promise.resolve({ data: null, error: null });
    }
  });

  // Mock cart query chain
  const cartData = options.cartData || [];
  const cartItems = options.cartItems || [];

  client.from = vi.fn().mockImplementation((table: string) => {
    const builder = createMockQueryBuilder();

    if (table === 'carts') {
      builder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: cartData[0] || { id: 'test-cart-id', user_id: 'test-user-id', status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'test-cart-id', user_id: 'test-user-id', status: 'active' },
              error: null,
            }),
          }),
        }),
      });
    }

    if (table === 'cart_items') {
      builder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: cartItems,
          error: null,
        }),
      });
      builder.delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
    }

    if (table === 'product_variants') {
      builder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: options.variantId || 'test-variant-id',
              product_id: options.productId || 'test-product-id',
              stock_qty: options.stockQty || 100,
              is_default: true,
            },
            error: null,
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: options.variantId || 'test-variant-id',
                  product_id: options.productId || 'test-product-id',
                  stock_qty: options.stockQty || 100,
                  is_default: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      });
    }

    return builder;
  });

  return client;
}

/**
 * Creates a mock client for product/order tests.
 */
export function createDataMockClient(options: {
  products?: Record<string, unknown>[];
  orders?: Record<string, unknown>[];
} = {}) {
  const client = createMockSupabaseClient();

  const products = options.products || [];
  const orders = options.orders || [];

  client.from = vi.fn().mockImplementation((table: string) => {
    const builder = createMockQueryBuilder();

    if (table === 'products') {
      builder.select = vi.fn().mockResolvedValue({
        data: products,
        error: null,
      });
    }

    if (table === 'orders') {
      builder.select = vi.fn().mockResolvedValue({
        data: orders,
        error: null,
      });
    }

    return builder;
  });

  return client;
}

// ============================================
// Mock for React Testing Library
// ============================================

/**
 * Creates a mock implementation that can be imported in test files.
 * Use this with vi.mock at the top of your test file.
 *
 * @example
 * ```typescript
 * // In your test file:
 * vi.mock('@/lib/supabase/client', () => ({
 *   createClient: () => createMockSupabaseClient(),
 *   supabase: createMockSupabaseClient(),
 * }));
 * ```
 */
export const mockSupabaseClient = createMockSupabaseClient();

/**
 * Resets all mocks in a Supabase client.
 * Call this in beforeEach or afterEach hooks.
 */
export function resetSupabaseMock(client: MockSupabaseClient) {
  client.auth.getUser.mockClear();
  client.auth.getSession.mockClear();
  client.auth.signInWithPassword.mockClear();
  client.auth.signUp.mockClear();
  client.auth.signOut.mockClear();
  client.auth.resetPasswordForEmail.mockClear();
  client.auth.onAuthStateChange.mockClear();
  client.auth.updateUser.mockClear();
  client.from.mockClear();
  client.rpc.mockClear();
}