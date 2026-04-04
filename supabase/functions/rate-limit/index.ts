/**
 * Rate Limiting Edge Function
 *
 * Server-side rate limiting for authentication, checkout, and API endpoints.
 * Uses database-backed counters for distributed rate limiting across all function instances.
 *
 * SECURITY FEATURES:
 * - IP-based identification for unauthenticated requests
 * - User ID-based identification for authenticated requests
 * - Configurable limits per action type
 * - Proper HTTP headers for rate limit status
 * - CORS validation for origin security
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0"

// Rate limit configurations by action type
const RATE_LIMIT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    windowSeconds: 900,
    blockSeconds: 1800,
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    windowSeconds: 3600,
    blockSeconds: 3600,
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    windowSeconds: 3600,
    blockSeconds: 3600,
  },
  checkout: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    windowSeconds: 900,
    blockSeconds: 1800,
  },
  payment: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    windowSeconds: 3600,
    blockSeconds: 3600,
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
    windowSeconds: 60,
    blockSeconds: 300,
  },
} as const

type RateLimitAction = keyof typeof RATE_LIMIT_CONFIGS

interface RateLimitRequest {
  action: RateLimitAction
  identifier?: string // Optional: user ID for authenticated requests
  ip?: string // Optional: IP address for unauthenticated requests
  increment?: boolean // Whether to increment the counter (default: true)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string | null
  blocked: boolean
  retryAfter: number // Seconds until reset
  limit: number
  window: number // Window in seconds
}

interface RateLimitEntry {
  id: string
  identifier: string
  action_type: string
  attempt_count: number
  first_attempt: string
  blocked_until: string | null
  created_at: string
  updated_at: string
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]

// Get allowed origin from request
function getAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin')
  if (!origin) return null

  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }

  // Check for Supabase project URLs (pattern: https://xxxxx.supabase.co)
  try {
    const url = new URL(origin)
    if (url.hostname.endsWith('.supabase.co')) {
      return origin
    }
    // Also allow Vercel deployments
    if (url.hostname.endsWith('.vercel.app')) {
      return origin
    }
  } catch {
    // Invalid URL, reject
  }

  return null
}

// CORS headers
function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-IP',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

// JSON response helper
function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

// Rate limit headers helper
function rateLimitHeaders(
  result: RateLimitResult,
  config: typeof RATE_LIMIT_CONFIGS[RateLimitAction]
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(config.maxAttempts),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil((result.resetAt ? new Date(result.resetAt).getTime() : Date.now() + config.windowMs) / 1000)),
    'Retry-After': result.blocked ? String(result.retryAfter) : '0',
  }
}

// Extract client IP from request
function getClientIP(req: Request): string {
  // Check various headers for client IP (proxies, load balancers)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim()
  }

  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const clientIP = req.headers.get('x-client-ip')
  if (clientIP) {
    return clientIP.trim()
  }

  // Fallback to unknown (should not happen in production)
  return 'unknown'
}

// Validate action type
function isValidAction(action: string): action is RateLimitAction {
  return action in RATE_LIMIT_CONFIGS
}

// Check rate limit using database
async function checkRateLimitDB(
  supabase: ReturnType<typeof createClient>,
  action: RateLimitAction,
  identifier: string,
  increment: boolean = true
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action]
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)

  // Try to get existing entry
  const { data: existing, error: fetchError } = await supabase
    .from('rate_limit_entries')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', action)
    .maybeSingle()

  if (fetchError) {
    console.error('Rate limit fetch error:', fetchError)
    // On error, allow the request (fail open for availability)
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: null,
      blocked: false,
      retryAfter: 0,
      limit: config.maxAttempts,
      window: config.windowSeconds,
    }
  }

  // Check if currently blocked
  if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
    const retryAfter = Math.ceil(
      (new Date(existing.blocked_until).getTime() - now.getTime()) / 1000
    )
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.blocked_until,
      blocked: true,
      retryAfter,
      limit: config.maxAttempts,
      window: config.windowSeconds,
    }
  }

  // Check if window has expired (reset counter)
  if (!existing || new Date(existing.first_attempt) < windowStart) {
    if (increment) {
      // Create new entry or reset existing
      const { error: upsertError } = await supabase
        .from('rate_limit_entries')
        .upsert(
          {
            identifier,
            action_type: action,
            attempt_count: 1,
            first_attempt: now.toISOString(),
            blocked_until: null,
            updated_at: now.toISOString(),
          },
          { onConflict: 'identifier,action_type' }
        )

      if (upsertError) {
        console.error('Rate limit upsert error:', upsertError)
      }
    }

    return {
      allowed: true,
      remaining: increment ? config.maxAttempts - 1 : config.maxAttempts,
      resetAt: new Date(now.getTime() + config.windowMs).toISOString(),
      blocked: false,
      retryAfter: 0,
      limit: config.maxAttempts,
      window: config.windowSeconds,
    }
  }

  // Check if limit exceeded
  if (existing.attempt_count >= config.maxAttempts) {
    const blockedUntil = new Date(now.getTime() + config.blockDurationMs)

    if (increment) {
      await supabase
        .from('rate_limit_entries')
        .update({
          blocked_until: blockedUntil.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id)
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: blockedUntil.toISOString(),
      blocked: true,
      retryAfter: config.blockSeconds,
      limit: config.maxAttempts,
      window: config.windowSeconds,
    }
  }

  // Within limits, increment counter if requested
  if (increment) {
    const newCount = existing.attempt_count + 1
    const shouldBlock = newCount >= config.maxAttempts
    const blockedUntil = shouldBlock
      ? new Date(now.getTime() + config.blockDurationMs).toISOString()
      : null

    await supabase
      .from('rate_limit_entries')
      .update({
        attempt_count: newCount,
        blocked_until: blockedUntil,
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id)

    return {
      allowed: !shouldBlock,
      remaining: shouldBlock ? 0 : config.maxAttempts - newCount,
      resetAt: blockedUntil || new Date(new Date(existing.first_attempt).getTime() + config.windowMs).toISOString(),
      blocked: shouldBlock,
      retryAfter: shouldBlock ? config.blockSeconds : 0,
      limit: config.maxAttempts,
      window: config.windowSeconds,
    }
  }

  // Just checking, don't increment
  return {
    allowed: true,
    remaining: config.maxAttempts - existing.attempt_count,
    resetAt: new Date(new Date(existing.first_attempt).getTime() + config.windowMs).toISOString(),
    blocked: false,
    retryAfter: 0,
    limit: config.maxAttempts,
    window: config.windowSeconds,
  }
}

// Clear rate limit for an identifier
async function clearRateLimitDB(
  supabase: ReturnType<typeof createClient>,
  action: RateLimitAction,
  identifier: string
): Promise<boolean> {
  const { error } = await supabase
    .from('rate_limit_entries')
    .delete()
    .eq('identifier', identifier)
    .eq('action_type', action)

  return !error
}

// Log security event
async function logSecurityEvent(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: details.userId as string | null,
      ip_address: details.ip as string | null,
      details,
      severity: details.blocked ? 'warning' : 'info',
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = getAllowedOrigin(req)
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const origin = getAllowedOrigin(req)

  // Validate content type
  const contentType = req.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return jsonResponse(400, { error: 'Content-Type must be application/json' }, corsHeaders(origin))
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration')
    return jsonResponse(500, { error: 'Server configuration error' }, corsHeaders(origin))
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body: RateLimitRequest = await req.json()

    // Validate action type
    if (!body.action || !isValidAction(body.action)) {
      return jsonResponse(400, { error: 'Invalid action type' }, corsHeaders(origin))
    }

    const config = RATE_LIMIT_CONFIGS[body.action]
    const clientIP = body.ip || getClientIP(req)

    // Determine identifier: user ID > IP address
    const identifier = body.identifier || clientIP

    if (!identifier || identifier === 'unknown') {
      return jsonResponse(400, { error: 'Unable to identify client' }, corsHeaders(origin))
    }

    // Get authenticated user from JWT if available
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        const { data: { user } } = await supabase.auth.getUser(token)
        userId = user?.id || null
      } catch {
        // Invalid token, continue without user
      }
    }

    // For authenticated endpoints, use user ID if available
    const finalIdentifier = userId && ['checkout', 'payment', 'api'].includes(body.action)
      ? userId
      : identifier

    // Check rate limit
    const result = await checkRateLimitDB(
      supabase,
      body.action,
      finalIdentifier,
      body.increment !== false
    )

    // Log blocked attempts
    if (result.blocked) {
      await logSecurityEvent(supabase, 'RATE_LIMIT_BLOCKED', {
        action: body.action,
        identifier: '[REDACTED]',
        ip: clientIP,
        userId,
        blocked: true,
        retryAfter: result.retryAfter,
      })
    }

    // Build response
    const headers = {
      ...corsHeaders(origin),
      ...rateLimitHeaders(result, config),
    }

    // Return 429 for blocked requests
    if (result.blocked) {
      return jsonResponse(429, {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
        resetAt: result.resetAt,
      }, headers)
    }

    return jsonResponse(200, {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
      limit: result.limit,
      window: result.window,
    }, headers)
  } catch (error) {
    console.error('Rate limit error:', error)
    return jsonResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, corsHeaders(origin))
  }
})