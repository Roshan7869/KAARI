import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminErr = await requireAdmin();
  if (adminErr) return adminErr;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entity_type') || '';
  const adminEmail = searchParams.get('admin_email') || '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);
  if (adminEmail) {
    const sanitized = adminEmail.replace(/[%_]/g, '\\$&');
    query = query.ilike('admin_email', `%${sanitized}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    logger.error('Admin audit query failed', error, { route: 'admin/audit' });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    entries: data || [],
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  });
}
