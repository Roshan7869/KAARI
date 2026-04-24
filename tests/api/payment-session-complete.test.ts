import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/payment-session/complete/route';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/cashfree-server', () => ({
  getCashfreePaymentDetailsServer: vi.fn(),
}));

vi.mock('@/lib/logger-server', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCashfreePaymentDetailsServer } from '@/lib/cashfree-server';

function createMockRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/payment-session/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payment-session/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });
    const req = createMockRequest({ sessionId: 'sess_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const req = createMockRequest({ sessionId: 'sess_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ sessionId: 'sess_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(404);
  });

  it('returns 403 for session ownership mismatch', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'sess-db-id', user_id: 'other-user', status: 'pending', cf_order_id: 'cf-123' },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ sessionId: 'sess_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);
  });

  it('returns 400 when Cashfree payment is not confirmed', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'sess-db-id', user_id: 'user-123', status: 'pending', cf_order_id: 'cf-123' },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
    (getCashfreePaymentDetailsServer as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_status: 'PENDING' });

    const req = createMockRequest({ sessionId: 'sess_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('not confirmed');
  });

  it('completes session when Cashfree confirms SUCCESS', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'sess-db-id', user_id: 'user-123', status: 'pending', cf_order_id: 'cf-123' },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
    (getCashfreePaymentDetailsServer as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_status: 'SUCCESS' });

    const mockAdminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, order_id: 'order-123', message: null }],
        error: null,
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockAdminSupabase);

    const req = createMockRequest({ sessionId: 'sess_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toBe('order-123');
  });

  it('allows dummy session completion when Cashfree is unavailable', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-123' });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'sess-db-id', user_id: 'user-123', status: 'pending', cf_order_id: 'cf-123' },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
    (getCashfreePaymentDetailsServer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

    const mockAdminSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, order_id: 'order-123', message: null }],
        error: null,
      }),
    };
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockAdminSupabase);

    const req = createMockRequest({ sessionId: 'dummy_123', transactionId: 'txn_123' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
