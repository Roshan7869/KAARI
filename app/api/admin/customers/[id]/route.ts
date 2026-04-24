import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { z } from 'zod';

const customerUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number').optional().nullable(),
  address_line1: z.string().max(300).optional().nullable(),
  address_line2: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

/**
 * PATCH /api/admin/customers/[id]
 * Update a customer's profile. Admin-only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const { id: customerId } = await params;
  if (!customerId) return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Update profile fields
  const updateData: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) updateData.full_name = parsed.data.full_name;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

  if (Object.keys(updateData).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', customerId);

    if (profileError) {
      logger.error('Admin customer profile update failed', profileError, { route: 'admin/customers PATCH' });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }
  }

  // Update default shipping address if address fields provided
  const addressFields = {
    address_line1: parsed.data.address_line1,
    address_line2: parsed.data.address_line2,
    city: parsed.data.city,
    state: parsed.data.state,
    postal_code: parsed.data.postal_code,
    country: parsed.data.country,
  };
  const hasAddressUpdate = Object.values(addressFields).some(v => v !== undefined);
  if (hasAddressUpdate) {
    // Upsert default address
    const { data: existingAddr } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', customerId)
      .eq('is_default', true)
      .maybeSingle();

    const addrPayload = Object.fromEntries(
      Object.entries(addressFields).filter(([, v]) => v !== undefined)
    );

    if (existingAddr) {
      await supabase.from('addresses').update(addrPayload).eq('id', existingAddr.id);
    } else if (addressFields.address_line1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('addresses').insert({
        ...addrPayload,
        user_id: customerId,
        is_default: true,
        full_name: parsed.data.full_name ?? '',
        phone: parsed.data.phone ?? '',
      });
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/admin/customers/[id]
 * Returns full customer profile + order history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const { id: customerId } = await params;

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !profile) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const { data: address } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', customerId)
    .eq('is_default', true)
    .maybeSingle();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_amount, created_at')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ profile, address, orders: orders ?? [] });
}
