import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── GET: list all billboard slots (admin view — includes inactive) ─
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('billboard_products')
    .select(`
      id,
      display_order,
      tag,
      is_active,
      custom_image_url,
      product_id,
      products (
        id,
        name,
        slug,
        price,
        product_media ( file_path, is_primary, sort_order )
      )
    `)
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// ── PUT: replace billboard with a new ordered list ─────────────────
// Body: { slots: Array<{ product_id, tag, is_active }> }
// Slots are ordered — index 0 = display_order 0.
export async function PUT(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();

  const body = await req.json() as {
    slots: Array<{ product_id: string; tag?: string; is_active?: boolean; custom_image_url?: string }>;
  };

  if (!Array.isArray(body.slots)) {
    return NextResponse.json({ error: 'slots must be an array' }, { status: 400 });
  }

  if (body.slots.length > 6) {
    return NextResponse.json({ error: 'Maximum 6 billboard slots allowed' }, { status: 400 });
  }

  // Atomic replace: delete all + insert new
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (admin as any).from('billboard_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (body.slots.length === 0) {
    return NextResponse.json({ success: true, count: 0 });
  }

  const rows = body.slots.map((slot, i) => ({
    product_id: slot.product_id,
    display_order: i,
    tag: slot.tag ?? null,
    is_active: slot.is_active !== false,
    custom_image_url: slot.custom_image_url ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insErr } = await (admin as any)
    .from('billboard_products')
    .insert(rows)
    .select('id');

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ success: true, count: inserted?.length ?? 0 });
}
