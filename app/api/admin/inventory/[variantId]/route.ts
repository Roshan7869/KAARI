import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const UpdateStockSchema = z.object({
  stock_qty: z.number().int().min(0).max(99999),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { variantId } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('product_variants')
    .update({ stock_qty: parsed.data.stock_qty })
    .eq('id', variantId);

  if (error) {
    logger.error('Admin inventory PATCH failed', { variantId, error: error.message });
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
