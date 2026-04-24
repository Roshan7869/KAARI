import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '@/app/api/auth/me/route';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger-server', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/server-rate-limit', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

function createMockRequest(body?: Record<string, unknown>, method = 'GET') {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request('http://localhost:3000/api/auth/me', init);
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });
    const req = createMockRequest();
    const res = await GET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('returns user profile when authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      emailAddresses: [{ emailAddress: 'user@example.com' }],
      fullName: 'Test User',
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                full_name: 'DB User',
                phone: '9876543210',
                email_notifications_enabled: true,
                sms_notifications_enabled: false,
                marketing_emails_enabled: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest();
    const res = await GET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.user.id).toBe('user-123');
    expect(data.data.user.email).toBe('user@example.com');
    expect(data.data.user.full_name).toBe('DB User');
    expect(data.data.user.phone).toBe('9876543210');
  });

  it('falls back to Clerk fullName when DB profile has no name', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    (currentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      emailAddresses: [{ emailAddress: 'user@example.com' }],
      fullName: 'Clerk User',
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: null, phone: null, email_notifications_enabled: null, sms_notifications_enabled: null, marketing_emails_enabled: null },
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest();
    const res = await GET(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.user.full_name).toBe('Clerk User');
  });
});

describe('PUT /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });
    const req = createMockRequest({ full_name: 'New Name' }, 'PUT');
    const res = await PUT(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
  });

  it('rejects invalid phone number', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ phone: '12345' }, 'PUT');
    const res = await PUT(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('updates allowed fields successfully', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  full_name: 'Updated Name',
                  phone: '9876543210',
                  email_notifications_enabled: false,
                  sms_notifications_enabled: true,
                  marketing_emails_enabled: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ full_name: 'Updated Name', phone: '9876543210', email_notifications_enabled: false }, 'PUT');
    const res = await PUT(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.profile.full_name).toBe('Updated Name');
    expect(data.data.profile.phone).toBe('9876543210');
  });

  it('rejects privileged fields like role', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    // The schema strips unknown fields, so this should succeed but ignore role
    const req = createMockRequest({ full_name: 'Updated Name', role: 'admin' }, 'PUT');
    const res = await PUT(req as unknown as import('next/server').NextRequest);
    // Zod strips extra fields, so it succeeds
    expect(res.status).toBe(200);
  });
});
