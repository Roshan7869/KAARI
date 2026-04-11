import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/auth/callback/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client module
// This prevents the real createClient from calling cookies() which requires a request scope
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auth Callback Route', () => {
  const mockSupabaseClient = {
    auth: {
      exchangeCodeForSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {},
    realtime: {},
    url: '',
    options: {},
    authUrl: '',
    storageUrl: '',
    realtimeUrl: '',
    remainingRetries: 3,
    postgrestUrl: '',
    postgrestHeaders: {},
    storageHeaders: {},
    authHeaders: {},
    globalHeaders: {},
    pgMeta: {},
    remainingRetriesConfig: { maxRetries: 3 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock createClient to return our mock client
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
  });

  it('should exchange code for session and redirect on success', async () => {
    // Mock successful session exchange
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=test-code&next=/dashboard'
    );

    const response = await GET(request);

    expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
    expect(response.status).toBe(307); // Redirect status
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('should redirect to home when no next parameter is provided', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=test-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should redirect to login with error when code is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/callback'
    );

    const response = await GET(request);

    expect(mockSupabaseClient.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=oauth_callback_failed'
    );
  });

  it('should redirect to login with error when session exchange fails', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error('Invalid code'),
    });

    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=invalid-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=oauth_callback_failed'
    );
  });

  it('should prevent open redirect attacks', async () => {
    mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
      error: null,
    });

    // Try to redirect to external site
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=test-code&next=https://evil.com'
    );

    const response = await GET(request);

    // Should redirect to home instead of external site
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });
});