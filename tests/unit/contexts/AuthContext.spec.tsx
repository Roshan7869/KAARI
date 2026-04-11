/**
 * Unit Tests for contexts/AuthContext.tsx
 *
 * Tests for authentication context provider.
 * Simplified to avoid async rendering issues in test environment.
 * Target coverage: 80%
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
      signInWithPassword: (params: unknown) => mockSignInWithPassword(params),
      signUp: (params: unknown) => mockSignUp(params),
      signOut: () => mockSignOut(),
      resetPasswordForEmail: (email: string, options: unknown) => mockResetPasswordForEmail(email, options),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
    from: (table: string) => mockFrom(table),
    rpc: (name: string, params: unknown) => mockRpc(name, params),
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, isAdmin, signIn, signUp, signOut, resetPassword } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <div data-testid="is-admin">{isAdmin.toString()}</div>
      <button onClick={() => signIn('test@example.com', 'password').catch(() => {})}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password', 'Test User').catch(() => {})}>Sign Up</button>
      <button onClick={() => signOut().catch(() => {})}>Sign Out</button>
      <button onClick={() => resetPassword('test@example.com').catch(() => {})}>Reset Password</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockRpc.mockResolvedValue({ data: false, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('initialization', () => {
    it('renders without crashing', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initial state shows loading
      expect(screen.getByTestId('loading')).toBeDefined();
    });

    it('sets loading to false after initialization', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initialization
      await act(async () => {
        // Wait for state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function ComponentWithoutProvider() {
        useAuth();
        return null;
      }

      expect(() => render(<ComponentWithoutProvider />)).toThrow(
        'useAuth must be used within AuthProvider'
      );

      spy.mockRestore();
    });
  });

  describe('signIn', () => {
    it('calls signInWithPassword with correct params', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for component to mount
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign In').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('handles sign in error', async () => {
      const { toast } = await import('sonner');
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign In').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('signUp', () => {
    it('calls signUp with correct params', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user' } },
        error: null,
      });
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign Up').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: { data: { full_name: 'Test User' } },
      });
    });

    it('handles signup error', async () => {
      const { toast } = await import('sonner');
      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign Up').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('calls signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign Out').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('handles sign out error', async () => {
      const { toast } = await import('sonner');
      mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Sign Out').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail', async () => {
      const { toast } = await import('sonner');
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Reset Password').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
      expect(toast.success).toHaveBeenCalled();
    });

    it('handles reset password error', async () => {
      const { toast } = await import('sonner');
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await act(async () => {
        screen.getByText('Reset Password').click();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });
});