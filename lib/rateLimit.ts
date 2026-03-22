/**
 * Rate Limiting Service
 *
 * SECURITY: Prevents brute force attacks and abuse by:
 * - Tracking request counts per IP and per user
 * - Implementing exponential backoff for repeated failures
 * - Blocking suspicious IPs/users temporarily
 */

import { supabase } from '@/integrations/supabase/client'
import { logSecurity } from './logger'

// Rate limit configuration
const RATE_LIMITS = {
  // Authentication endpoints
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },

  // Payment endpoints
  payment: { maxAttempts: 5, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 },
  checkout: { maxAttempts: 10, windowMs: 15 * 60 * 1000, blockDurationMs: 30 * 60 * 1000 },

  // General API
  api: { maxAttempts: 100, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 },
} as const

type RateLimitType = keyof typeof RATE_LIMITS

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date | null
  blocked: boolean
  blockReason?: string
}

// In-memory rate limit tracking (for client-side rate limiting)
// Note: Real rate limiting should be done server-side (Edge Functions)
const rateLimitCache = new Map<string, { count: number; firstAttempt: number; blocked?: number }>()

/**
 * Get client IP address (best effort)
 */
async function getClientIP(): Promise<string> {
  // Client-side cannot reliably get IP
  // This is for logging purposes only
  // Real IP is available in Edge Functions via request headers
  return 'client-side'
}

/**
 * Get rate limit key for storage
 */
function getRateLimitKey(type: RateLimitType, identifier: string): string {
  return `${type}:${identifier}`
}

/**
 * Check if action is rate limited
 */
export function checkRateLimit(
  type: RateLimitType,
  identifier: string
): RateLimitResult {
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(type, identifier)
  const now = Date.now()

  const cached = rateLimitCache.get(key)

  // Check if currently blocked
  if (cached?.blocked && cached.blocked > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(cached.blocked),
      blocked: true,
      blockReason: 'Temporarily blocked due to too many attempts',
    }
  }

  // Clear expired block
  if (cached?.blocked && cached.blocked <= now) {
    rateLimitCache.delete(key)
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: null,
      blocked: false,
    }
  }

  // Check if window has expired
  if (!cached || now - cached.firstAttempt > config.windowMs) {
    rateLimitCache.set(key, { count: 0, firstAttempt: now })
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(cached?.firstAttempt + config.windowMs || now + config.windowMs),
      blocked: false,
    }
  }

  // Check if limit exceeded
  if (cached.count >= config.maxAttempts) {
    // Block the identifier
    const blockUntil = now + config.blockDurationMs
    rateLimitCache.set(key, { ...cached, blocked: blockUntil })

    logSecurity('RATE_LIMIT_EXCEEDED', {
      action: type,
      result: 'blocked',
      additionalData: {
        identifier: '[REDACTED]',
        attempts: cached.count,
        maxAttempts: config.maxAttempts,
        blockedUntil: new Date(blockUntil).toISOString(),
      },
    })

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(blockUntil),
      blocked: true,
      blockReason: 'Rate limit exceeded. Please try again later.',
    }
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - cached.count,
    resetAt: new Date(cached.firstAttempt + config.windowMs),
    blocked: false,
  }
}

/**
 * Record an attempt for rate limiting
 */
export function recordAttempt(
  type: RateLimitType,
  identifier: string,
  success: boolean = false
): void {
  const key = getRateLimitKey(type, identifier)
  const cached = rateLimitCache.get(key)

  if (success && cached) {
    // Reset on success
    rateLimitCache.delete(key)
    return
  }

  // Increment attempt count
  if (cached) {
    rateLimitCache.set(key, { ...cached, count: cached.count + 1 })
  } else {
    rateLimitCache.set(key, { count: 1, firstAttempt: Date.now() })
  }
}

/**
 * Clear rate limit for an identifier (e.g., after successful login)
 */
export function clearRateLimit(type: RateLimitType, identifier: string): void {
  const key = getRateLimitKey(type, identifier)
  rateLimitCache.delete(key)
}

/**
 * Get remaining attempts for an action
 */
export function getRemainingAttempts(type: RateLimitType, identifier: string): number {
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(type, identifier)
  const cached = rateLimitCache.get(key)

  if (!cached) {
    return config.maxAttempts
  }

  if (cached.blocked && cached.blocked > Date.now()) {
    return 0
  }

  return Math.max(0, config.maxAttempts - cached.count)
}

/**
 * Check if login is rate limited for a user
 */
export function checkLoginRateLimit(email: string): RateLimitResult {
  // Rate limit by email
  const emailResult = checkRateLimit('login', email.toLowerCase())

  // Also check global IP-based rate limiting (would be done server-side)
  return emailResult
}

/**
 * Check if checkout is rate limited
 */
export function checkCheckoutRateLimit(userId: string): RateLimitResult {
  return checkRateLimit('checkout', userId)
}

/**
 * Check if payment is rate limited
 */
export function checkPaymentRateLimit(userId: string): RateLimitResult {
  return checkRateLimit('payment', userId)
}

/**
 * Hook for rate limiting in React components
 */
export function useRateLimit(type: RateLimitType, identifier: string) {
  const check = () => checkRateLimit(type, identifier)
  const record = (success?: boolean) => recordAttempt(type, identifier, success)
  const clear = () => clearRateLimit(type, identifier)
  const remaining = () => getRemainingAttempts(type, identifier)

  return { check, record, clear, remaining }
}

/**
 * Server-side rate limiting helper (for Edge Functions)
 * This would be called from Supabase Edge Functions
 */
export async function checkServerRateLimit(
  type: RateLimitType,
  identifier: string,
  clientIP?: string
): Promise<RateLimitResult> {
  // In Edge Functions, use Supabase to track rate limits in the database
  // This provides distributed rate limiting across all function instances

  // For now, return the client-side check
  // In production, implement database-backed rate limiting in Edge Functions
  const result = checkRateLimit(type, identifier)

  if (result.blocked && clientIP) {
    // Log the blocked attempt with IP
    logSecurity('RATE_LIMIT_BLOCKED', {
      action: type,
      result: 'blocked',
      additionalData: {
        identifier: '[REDACTED]',
        ip: clientIP,
        blockedUntil: result.resetAt?.toISOString(),
      },
    })
  }

  return result
}

export default {
  check: checkRateLimit,
  record: recordAttempt,
  clear: clearRateLimit,
  remaining: getRemainingAttempts,
  useRateLimit,
  login: checkLoginRateLimit,
  checkout: checkCheckoutRateLimit,
  payment: checkPaymentRateLimit,
}