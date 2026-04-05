/**
 * URL Validation and Security Utilities
 * Prevents open redirect vulnerabilities and validates URLs
 */

/**
 * Allowed domains for redirects (relative URLs always allowed)
 * Add production domains here
 */
const ALLOWED_DOMAINS = [
  // Add production domains when deployed
  // 'kaari.com',
  // 'www.kaari.com',
  // 'kaari.in',
  // For development
  'localhost',
]

/**
 * Validate that a URL is safe for redirect
 * Prevents open redirect attacks by checking against allowlist
 *
 * @param url - The URL to validate (can be relative or absolute)
 * @returns Safe URL for redirect, or default path if invalid
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  // Default to home if no URL provided
  if (!url) {
    return '/'
  }

  try {
    // Try to parse as URL
    const parsed = new URL(url, window.location.origin)

    // Check if it's a relative URL (same origin)
    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search
    }

    // Check if domain is in allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )

    if (isAllowedDomain) {
      return parsed.href
    }

    // Log potential security issue
    console.warn('SECURITY: Blocked redirect to disallowed domain:', parsed.origin)

    // Return safe default
    return '/'
  } catch {
    // If URL parsing fails, it might be a relative path
    // Check for suspicious patterns
    if (url.startsWith('//') || url.startsWith('http:') || url.startsWith('https:')) {
      console.warn('SECURITY: Blocked potentially malicious redirect:', url)
      return '/'
    }

    // Treat as relative path - prepend / if needed
    const safePath = url.startsWith('/') ? url : `/${url}`
    return safePath
  }
}

/**
 * Check if URL is a relative path (safe for redirect)
 */
export function isRelativeUrl(url: string): boolean {
  if (!url) return false

  // Relative URLs start with / or # or ?
  // But NOT // (protocol-relative)
  if (url.startsWith('//')) return false

  return url.startsWith('/') || url.startsWith('#') || url.startsWith('?')
}

/**
 * Sanitize URL for use in navigation
 * Removes potentially dangerous characters
 */
export function sanitizeUrl(url: string): string {
  // Remove javascript: and data: protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']

  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return '/'
    }
  }

  // Remove any HTML tags
  return url.replace(/<[^>]*>/g, '')
}

/**
 * Validate order confirmation URL
 * Specifically for payment redirects
 */
export function validateOrderConfirmationUrl(orderId: string): string {
  // Validate orderId format (UUID)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!orderId || !uuidPattern.test(orderId)) {
    console.warn('SECURITY: Invalid order ID format')
    return '/'
  }

  return `/order-confirmation/${orderId}`
}

export default {
  validateRedirectUrl,
  isRelativeUrl,
  sanitizeUrl,
  validateOrderConfirmationUrl,
}