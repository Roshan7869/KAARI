import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

function requireAdmin(sessionClaims: Record<string, unknown> | null) {
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  return role === 'admin';
}

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !requireAdmin(sessionClaims as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId || !requireAdmin(sessionClaims as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as {
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      min_order_amount?: number;
      max_discount_amount?: number | null;
      usage_limit?: number | null;
      valid_from?: string;
      valid_until?: string | null;
    };

    if (!body.code || !body.type || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'code, type, and value are required' }, { status: 400 });
    }
    if (body.value <= 0) {
      return NextResponse.json({ error: 'value must be positive' }, { status: 400 });
    }
    if (body.type === 'percentage' && body.value > 100) {
      return NextResponse.json({ error: 'Percentage cannot exceed 100' }, { status: 400 });
    }

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .insert({
        code: body.code.toUpperCase().trim(),
        type: body.type,
        value: body.value,
        min_order_amount: body.min_order_amount ?? 0,
        max_discount_amount: body.max_discount_amount ?? null,
        usage_limit: body.usage_limit ?? null,
        valid_from: body.valid_from ?? new Date().toISOString(),
        valid_until: body.valid_until ?? null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const e = err as { code?: string; message: string };
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
