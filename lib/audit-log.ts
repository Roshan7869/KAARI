/**
 * Admin Audit Log Helper
 *
 * Records admin mutations in the admin_audit_log table.
 * Uses the service-role Supabase client so RLS is bypassed.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogEntry {
  adminId: string;
  adminEmail?: string;
  action: 'create' | 'update' | 'delete' | 'upload' | 'export' | 'import' | 'login';
  entityType: 'product' | 'order' | 'customer' | 'review' | 'coupon' | 'billboard' | 'media' | 'settings' | 'template';
  entityId?: string;
  entityLabel?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('admin_audit_log').insert({
      admin_id: entry.adminId,
      admin_email: entry.adminEmail,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
      ip_address: entry.ipAddress ?? null,
    });
  } catch (err) {
    // Non-blocking — never let audit failures break primary operations
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}

/**
 * Extract IP from Next.js request headers (Vercel-aware)
 */
export function getRequestIp(req: Request): string | undefined {
  const headers = new Headers((req as Request).headers);
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined
  );
}
