import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Whitelist of fields that can be updated via API
// code, value, type, usage_count are immutable after creation
const UpdateCouponSchema = z.object({
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  valid_until: z.string().datetime().optional().nullable(),
  usage_limit: z.number().int().min(1).max(100000).optional(),
  min_order_amount: z.number().min(0).optional(),
  max_discount_amount: z.number().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const { id } = await params;
    const body = await request.json();
    const validated = UpdateCouponSchema.parse(body);

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .update(validated)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const { id } = await params;
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
