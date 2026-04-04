import { getServerCashfreeConfig } from '@/lib/cashfree-server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/health
 * Health check endpoint for monitoring, CI smoke tests, and deployment verification.
 * Returns 200 when DB is reachable, 503 when degraded.
 */
export async function GET() {
  const requestStart = Date.now()
  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatency = 0
  let cashfreeConfig: Awaited<ReturnType<typeof getServerCashfreeConfig>> = null

  try {
    const supabase = await createClient()
    const t0 = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle()
    dbLatency = Date.now() - t0
    // PGRST116 = "no rows" which is fine — DB is reachable
    if (!error || error.code === 'PGRST116') {
      dbStatus = 'ok'
    }
  } catch {
    dbStatus = 'error'
  }

  try {
    cashfreeConfig = await getServerCashfreeConfig()
  } catch {
    cashfreeConfig = null
  }

  const httpStatus = dbStatus === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      integrations: {
        supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        cashfree_configured: Boolean(cashfreeConfig?.appId && cashfreeConfig?.secretKey),
        cashfree_webhook_configured: Boolean(cashfreeConfig?.webhookSecret),
        cloudinary_configured: Boolean(
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() &&
          process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY?.trim() &&
          process.env.CLOUDINARY_API_SECRET?.trim()
        ),
        upstash_configured: Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()),
        resend_configured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.NOTIFICATIONS_FROM_EMAIL?.trim()),
        app_url_configured: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.KAARI_BASE_URL?.trim()),
      },
      db_latency_ms: dbLatency,
      response_ms: Date.now() - requestStart,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'production',
    },
    { status: httpStatus }
  )
}
