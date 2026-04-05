/**
 * Admin Audit Logging Service
 *
 * SECURITY: Tracks all admin actions for compliance and security auditing
 * - Records who did what, when, and from where
 * - Stores before/after state for changes
 * - Provides audit trail for investigations
 */

import { supabase } from '@/integrations/supabase/client'

// Admin action types for type safety
export type AdminAction =
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'order_status_change'
  | 'order_refund'
  | 'user_role_change'
  | 'user_block'
  | 'user_unblock'
  | 'settings_update'
  | 'payment_gateway_config'
  | 'inventory_update'
  | 'bulk_import'
  | 'bulk_export'
  | 'dashboard_access'

interface AuditLogEntry {
  action: AdminAction
  resourceType: 'product' | 'order' | 'user' | 'settings' | 'inventory' | 'payment_gateway'
  resourceId?: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
}

interface AuditLogRecord {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id: string | null
  changes_before: Record<string, unknown> | null
  changes_after: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

/**
 * Get client metadata for audit logging
 */
function getClientMetadata(): { ip: string; userAgent: string } {
  return {
    ip: 'client-side', // Real IP captured in Edge Functions
    userAgent: navigator.userAgent,
  }
}

/**
 * Log an admin action to the database
 */
export async function logAdminAudit(
  entry: AuditLogEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .rpc('has_role', { _role: 'admin', _user_id: user.id })
      .single()

    if (roleError || !roleData) {
      return { success: false, error: 'Not authorized - admin role required' }
    }

    const metadata = getClientMetadata()

    // Insert audit log
    const { error: insertError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: user.id,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        changes_before: entry.changes?.before || null,
        changes_after: entry.changes?.after || null,
        ip_address: metadata.ip,
        user_agent: metadata.userAgent,
        metadata: entry.metadata || null,
      })

    if (insertError) {
      console.error('Failed to log admin audit:', insertError)
      return { success: false, error: insertError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Admin audit logging error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log product creation
 */
export async function logProductCreate(
  productId: string,
  productData: Record<string, unknown>
): Promise<void> {
  await logAdminAudit({
    action: 'product_create',
    resourceType: 'product',
    resourceId: productId,
    changes: {
      before: null,
      after: productData,
    },
    metadata: { productName: productData.name },
  })
}

/**
 * Log product update
 */
export async function logProductUpdate(
  productId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  await logAdminAudit({
    action: 'product_update',
    resourceType: 'product',
    resourceId: productId,
    changes: { before, after },
    metadata: { productName: after.name || before.name },
  })
}

/**
 * Log product deletion
 */
export async function logProductDelete(
  productId: string,
  productData: Record<string, unknown>
): Promise<void> {
  await logAdminAudit({
    action: 'product_delete',
    resourceType: 'product',
    resourceId: productId,
    changes: {
      before: productData,
      after: null,
    },
    metadata: { productName: productData.name },
  })
}

/**
 * Log order status change
 */
export async function logOrderStatusChange(
  orderId: string,
  previousStatus: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  await logAdminAudit({
    action: 'order_status_change',
    resourceType: 'order',
    resourceId: orderId,
    changes: {
      before: { status: previousStatus },
      after: { status: newStatus },
    },
    metadata: { reason },
  })
}

/**
 * Log order refund
 */
export async function logOrderRefund(
  orderId: string,
  amount: number,
  reason: string
): Promise<void> {
  await logAdminAudit({
    action: 'order_refund',
    resourceType: 'order',
    resourceId: orderId,
    changes: {
      after: { refundAmount: amount, refundReason: reason },
    },
    metadata: { amount, reason },
  })
}

/**
 * Log user role change
 */
export async function logUserRoleChange(
  targetUserId: string,
  previousRole: string,
  newRole: string
): Promise<void> {
  await logAdminAudit({
    action: 'user_role_change',
    resourceType: 'user',
    resourceId: targetUserId,
    changes: {
      before: { role: previousRole },
      after: { role: newRole },
    },
    metadata: { targetUserId },
  })
}

/**
 * Log settings update
 */
export async function logSettingsUpdate(
  settingKey: string,
  previousValue: unknown,
  newValue: unknown
): Promise<void> {
  await logAdminAudit({
    action: 'settings_update',
    resourceType: 'settings',
    changes: {
      before: { [settingKey]: previousValue },
      after: { [settingKey]: newValue },
    },
    metadata: { settingKey },
  })
}

/**
 * Log payment gateway configuration
 */
export async function logPaymentGatewayConfig(
  gatewayId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await logAdminAudit({
    action: 'payment_gateway_config',
    resourceType: 'payment_gateway',
    resourceId: gatewayId,
    changes: { after: changes },
    metadata: { gatewayId },
  })
}

/**
 * Retrieve audit logs for admin dashboard
 */
export async function getAuditLogs(params: {
  action?: AdminAction
  resourceType?: string
  adminId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ data: AuditLogRecord[] | null; error?: string; count?: number }> {
  try {
    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' }
    }

    const { data: roleData, error: roleError } = await supabase
      .rpc('has_role', { _role: 'admin', _user_id: user.id })
      .single()

    if (roleError || !roleData) {
      return { data: null, error: 'Not authorized' }
    }

    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })

    if (params.action) {
      query = query.eq('action', params.action)
    }
    if (params.resourceType) {
      query = query.eq('resource_type', params.resourceType)
    }
    if (params.adminId) {
      query = query.eq('admin_id', params.adminId)
    }
    if (params.startDate) {
      query = query.gte('created_at', params.startDate.toISOString())
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate.toISOString())
    }

    query = query
      .order('created_at', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1)

    const { data, error, count } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, count: count || undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get audit log statistics for dashboard
 */
export async function getAuditLogStats(
  startDate: Date,
  endDate: Date
): Promise<{
  data?: {
    totalActions: number
    actionsByType: Record<string, number>
    topAdmins: Array<{ admin_id: string; count: number }>
  }
  error?: string
}> {
  try {
    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Not authenticated' }
    }

    const { data: roleData } = await supabase
      .rpc('has_role', { _role: 'admin', _user_id: user.id })
      .single()

    if (!roleData) {
      return { error: 'Not authorized' }
    }

    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('action, admin_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (error) {
      return { error: error.message }
    }

    const actionsByType: Record<string, number> = {}
    const adminCounts: Record<string, number> = {}

    for (const log of data || []) {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
      adminCounts[log.admin_id] = (adminCounts[log.admin_id] || 0) + 1
    }

    const topAdmins = Object.entries(adminCounts)
      .map(([admin_id, count]) => ({ admin_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      data: {
        totalActions: data?.length || 0,
        actionsByType,
        topAdmins,
      },
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default {
  log: logAdminAudit,
  productCreate: logProductCreate,
  productUpdate: logProductUpdate,
  productDelete: logProductDelete,
  orderStatusChange: logOrderStatusChange,
  orderRefund: logOrderRefund,
  userRoleChange: logUserRoleChange,
  settingsUpdate: logSettingsUpdate,
  paymentGatewayConfig: logPaymentGatewayConfig,
  getLogs: getAuditLogs,
  getStats: getAuditLogStats,
}