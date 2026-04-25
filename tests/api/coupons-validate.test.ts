import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/coupons/validate/route';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock CSRF validation to pass for all tests
vi.mock('@/lib/csrf-server', () => ({
  validateCsrfToken: vi.fn().mockResolvedValue(true),
}));

import { createClient } from '@/lib/supabase/server';

function createMockRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/coupons/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when code is missing', async () => {
    const req = createMockRequest({ subtotal: 100 });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  it('returns 400 when subtotal is not a number', async () => {
    const req = createMockRequest({ code: 'SAVE10', subtotal: 'abc' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns invalid for expired coupon', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  code: 'SAVE10',
                  type: 'percentage',
                  value: 10,
                  min_order_amount: 0,
                  max_discount_amount: null,
                  usage_limit: null,
                  usage_count: 0,
                  valid_from: new Date(Date.now() + 86400000).toISOString(), // future
                  valid_until: null,
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ code: 'SAVE10', subtotal: 100 });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('not yet active');
  });

  it('calculates percentage discount correctly', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  code: 'SAVE10',
                  type: 'percentage',
                  value: 10,
                  min_order_amount: 0,
                  max_discount_amount: 50,
                  usage_limit: null,
                  usage_count: 0,
                  valid_from: new Date(Date.now() - 86400000).toISOString(),
                  valid_until: new Date(Date.now() + 86400000).toISOString(),
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ code: 'SAVE10', subtotal: 1000 });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.discount).toBe(50); // capped at max_discount_amount
    expect(data.finalAmount).toBe(950);
  });

  it('calculates fixed discount correctly', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  code: 'FLAT100',
                  type: 'fixed',
                  value: 100,
                  min_order_amount: 200,
                  max_discount_amount: null,
                  usage_limit: null,
                  usage_count: 0,
                  valid_from: new Date(Date.now() - 86400000).toISOString(),
                  valid_until: new Date(Date.now() + 86400000).toISOString(),
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ code: 'FLAT100', subtotal: 500 });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.discount).toBe(100);
    expect(data.finalAmount).toBe(400);
  });

  it('rejects coupon below minimum order amount', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '1',
                  code: 'SAVE10',
                  type: 'percentage',
                  value: 10,
                  min_order_amount: 500,
                  max_discount_amount: null,
                  usage_limit: null,
                  usage_count: 0,
                  valid_from: new Date(Date.now() - 86400000).toISOString(),
                  valid_until: new Date(Date.now() + 86400000).toISOString(),
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = createMockRequest({ code: 'SAVE10', subtotal: 100 });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toContain('Minimum order');
  });
});
