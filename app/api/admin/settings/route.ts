import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('site_settings')
      .select('key, value')
      .in('key', ['free_shipping']);

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const { userId } = await auth();

    const body = await request.json();
    const { key, value } = body as { key: string; value: unknown };

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'key and value are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId })
      .eq('key', key);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
