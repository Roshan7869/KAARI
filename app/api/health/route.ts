import { getServerCashfreeConfig } from '@/lib/cashfree-server'
import { validateCashfreeConfig } from '@/lib/startup-checks'
import { logger } from '@/lib/logger-server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/verify-jwt'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/health
 * Health check endpoint for monitoring, CI smoke tests, and deployment verification.
 *
 * - Unauthenticated users: receive only { status, timestamp } (no internals)
 * - Authenticated admins: receive full integration status details
 */
export async function GET(request: NextRequest) {
  const requestStart = Date.now()

  // Always perform DB check regardless of auth level
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatency = 0

  try {
    const supabase = await createClient()
    const t0 = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()
    dbLatency = Date.now() - t0
    if (!error || error.code === 'PGRST116') {
      dbStatus = 'ok'
    }
  } catch {
    dbStatus = 'error'
  }

  const httpStatus = dbStatus === 'ok' ? 200 : 503

  // Minimal response for non-admin users
  const minimalResponse = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
  }

  // Check if user is an admin
  const adminCheck = await requireAdmin()
  if (adminCheck) {
    // Not an admin — return minimal health info
    return NextResponse.json(minimalResponse, { status: httpStatus })
  }

  // Admin user — return full integration details
  let cashfreeConfig: Awaited<ReturnType<typeof getServerCashfreeConfig>> = null
  try {
    cashfreeConfig = await getServerCashfreeConfig()
  } catch {
    cashfreeConfig = null
  }

  const cashfreeCheck = validateCashfreeConfig()
  if (!cashfreeCheck.passed) {
    logger.error('STARTUP CHECK FAILED', cashfreeCheck.errors, { context: 'cashfree-config' })
  }

  return NextResponse.json(
    {
      ...minimalResponse,
      db: dbStatus,
      integrations: {
        supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        cashfree_configured: Boolean(cashfreeConfig?.appId && cashfreeConfig?.secretKey),
        cashfree_webhook_configured: Boolean(cashfreeConfig?.webhookSecret),
        cashfree: {
          mode: (process.env.CASHFREE_MODE?.trim().toLowerCase() ?? 'sandbox'),
          warnings: cashfreeCheck.warnings,
          errors: cashfreeCheck.errors,
        },
        cloudinary_configured: Boolean(
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() &&
          process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY?.trim() &&
          process.env.CLOUDINARY_API_SECRET?.trim()
        ),
        cloudinary_webhook_configured: Boolean(process.env.CLOUDINARY_WEBHOOK_SECRET?.trim()),
        upstash_configured: Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()),
        resend_configured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.NOTIFICATIONS_FROM_EMAIL?.trim()),
        app_url_configured: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.KAARI_BASE_URL?.trim()),
      },
      db_latency_ms: dbLatency,
      response_ms: Date.now() - requestStart,
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'production',
    },
    { status: httpStatus }
  )
}