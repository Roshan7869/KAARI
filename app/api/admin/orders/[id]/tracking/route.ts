import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const schema = z.object({
  shipping_tracking_id:  z.string().max(100).optional(),
  shipping_tracking_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

/**
 * PATCH /api/admin/orders/[id]/tracking
 * Admin-only endpoint to update shipment tracking info after dispatch.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const supabase = createAdminClient();

  // ── Validate body ─────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // ── Update tracking fields ────────────────────────────────────────────
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update(parsed.data)
    .eq('id', id);

  if (error) {
    logger.error('Admin order tracking PATCH failed', { id, error: error.message });
    return NextResponse.json({ error: 'Failed to update tracking' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
