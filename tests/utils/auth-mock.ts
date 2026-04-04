/**
 * Auth Context Mock Factory
 *
 * This module provides utilities for mocking the AuthContext
 * in React component tests. It supports:
 * - useAuth hook mock
 * - AuthProvider mock wrapper
 * - Different auth states (logged in/out, admin/user)
 */

import { vi } from 'vitest';
import React from 'react';
import type { User, Session } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface MockAuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
}

export interface MockAuthOptions {
  user?: Partial<User> | null;
  session?: Partial<Session> | null;
  loading?: boolean;
  isAdmin?: boolean;
}

// ============================================
// Default Mock Data
// ============================================

export const defaultMockAuthUser: User = {
  id: 'test-user-id',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User',
  },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const defaultMockAuthSession: Session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: defaultMockAuthUser,
};

export const defaultMockAuthAdminUser: User = {
  ...defaultMockAuthUser,
  id: 'test-admin-id',
  email: 'admin@example.com',
  user_metadata: {
    full_name: 'Admin User',
  },
};

// ============================================
// Mock Factory Functions
// ============================================

/**
 * Creates a mock auth context value for testing.
 *
 * @example
 * ```typescript
 * const authValue = createMockAuthContext();
 * vi.mock('@/contexts/AuthContext', () => ({
 *   useAuth: () => authValue,
 * }));
 * ```
 */
export function createMockAuthContext(
  options: MockAuthOptions = {}
): MockAuthContextValue {
  const {
    user = defaultMockAuthUser,
    session = defaultMockAuthSession,
    loading = false,
    isAdmin = false,
  } = options;

  // Determine user state based on options
  const finalUser = user === null ? null : { ...defaultMockAuthUser, ...user };
  const finalSession = session === null ? null : { ...defaultMockAuthSession, ...session };

  // If user is null, session should also be null
  const resolvedSession = finalUser ? finalSession : null;

  return {
    user: finalUser,
    session: resolvedSession,
    loading,
    isAdmin,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock auth context for a logged-in admin user.
 */
export function createAdminAuthContext(): MockAuthContextValue {
  return createMockAuthContext({
    user: defaultMockAuthAdminUser,
    isAdmin: true,
    loading: false,
  });
}

/**
 * Creates a mock auth context for a logged-in regular user.
 */
export function createUserAuthContext(): MockAuthContextValue {
  return createMockAuthContext({
    user: defaultMockAuthUser,
    isAdmin: false,
    loading: false,
  });
}

/**
 * Creates a mock auth context for a logged-out user.
 */
export function createLoggedOutAuthContext(): MockAuthContextValue {
  return createMockAuthContext({
    user: null,
    session: null,
    isAdmin: false,
    loading: false,
  });
}

/**
 * Creates a mock auth context for loading state.
 */
export function createLoadingAuthContext(): MockAuthContextValue {
  return createMockAuthContext({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });
}

// ============================================
// React Testing Utilities
// ============================================

/**
 * Creates a mock useAuth hook for component testing.
 *
 * @example
 * ```typescript
 * // In your test file:
 * const mockUseAuth = createMockUseAuth({ isAdmin: true });
 *
 * vi.mock('@/contexts/AuthContext', () => ({
 *   useAuth: () => mockUseAuth,
 * }));
 *
 * // Or with custom state:
 * const mockUseAuth = createMockUseAuth({
 *   user: { email: 'custom@example.com' },
 *   loading: false,
 * });
 * ```
 */
export function createMockUseAuth(options: MockAuthOptions = {}): () => MockAuthContextValue {
  const authValue = createMockAuthContext(options);
  return () => authValue;
}

/**
 * Creates a mock AuthProvider wrapper for use in renderWithProviders.
 *
 * @example
 * ```typescript
 * const wrapper = createMockAuthProvider({ isAdmin: true });
 *
 * render(<MyComponent />, { wrapper });
 * ```
 */
export function createMockAuthProvider(options: MockAuthOptions = {}): React.FC<{ children: React.ReactNode }> {
  const authValue = createMockAuthContext(options);

  return function MockAuthProvider({ children }: { children: React.ReactNode }) {
    const AuthContext = React.createContext<MockAuthContextValue | undefined>(authValue);
    return React.createElement(AuthContext.Provider, { value: authValue }, children);
  };
}

// ============================================
// Test Wrapper Components
// ============================================

/**
 * Mock AuthContext for testing components that use useAuth.
 * This should be used with vi.mock at the top of your test file.
 *
 * @example
 * ```typescript
 * // At the top of your test file:
 * vi.mock('@/contexts/AuthContext', () => ({
 *   useAuth: vi.fn(() => ({
 *     user: { id: 'test-id', email: 'test@example.com' },
 *     session: { access_token: 'test-token' },
 *     loading: false,
 *     isAdmin: false,
 *     signIn: vi.fn(),
 *     signUp: vi.fn(),
 *     signOut: vi.fn(),
 *     resetPassword: vi.fn(),
 *   })),
 * }));
 * ```
 */

// ============================================
// Mock Hook Export for vi.mock
// ============================================

/**
 * Pre-configured mock hooks for common scenarios.
 * Import and use directly in vi.mock calls.
 */
export const mockUseAuthLoggedOut = createMockUseAuth({ user: null, session: null });
export const mockUseAuthUser = createMockUseAuth({ isAdmin: false });
export const mockUseAuthAdmin = createMockUseAuth({ isAdmin: true });
export const mockUseAuthLoading = createMockUseAuth({ loading: true, user: null });

// ============================================
// Mock Reset Utility
// ============================================

/**
 * Resets all mocks in an auth context value.
 * Call this in beforeEach or afterEach hooks.
 */
export function resetAuthMock(authValue: MockAuthContextValue) {
  authValue.signIn.mockClear();
  authValue.signUp.mockClear();
  authValue.signOut.mockClear();
  authValue.resetPassword.mockClear();
}