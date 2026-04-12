import { logger } from '@/lib/logger';
/**
 * @deprecated Use lib/csrf-server.ts instead.
 * This module provides client-side CSRF which is NOT effective for server-side validation.
 * Server-side CSRF protection using HTTP-only cookies is now in lib/csrf-server.ts.
 *
 * CSRF (Cross-Site Request Forgery) Protection Utilities
 * Client-side CSRF token generation and validation
 *
 * Note: For production, CSRF tokens should be generated server-side
 * and validated on the server for sensitive operations.
 */

const CSRF_TOKEN_KEY = 'kaari_csrf_token';
const CSRF_TOKEN_EXPIRY_KEY = 'kaari_csrf_token_expiry';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Last resort fallback (should not happen in modern browsers)
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a CSRF token and store it in sessionStorage
 * Returns the token to be included in forms or headers
 */
export function generateCsrfToken(): string {
  const token = generateSecureToken();
  const expiry = Date.now() + TOKEN_EXPIRY_MS;

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    sessionStorage.setItem(CSRF_TOKEN_EXPIRY_KEY, expiry.toString());
  }

  return token;
}

/**
 * Validate a CSRF token against the stored token
 * Returns true if the token is valid and not expired
 * SECURITY: Does not bypass validation in SSR context - returns false instead
 */
export function validateCsrfToken(token: string): boolean {
  // SECURITY: In SSR context, we cannot validate CSRF tokens
  // Return false instead of bypassing validation
  if (typeof sessionStorage === 'undefined') {
    logger.warn('CSRF validation failed: sessionStorage not available (SSR context)');
    return false;
  }

  if (!token) {
    logger.warn('CSRF validation failed: no token provided');
    return false;
  }

  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const storedExpiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);

  if (!storedToken || !storedExpiry) {
    logger.warn('CSRF token not found in storage');
    return false;
  }

  // Check if token has expired
  const expiry = parseInt(storedExpiry, 10);
  if (Date.now() > expiry) {
    logger.warn('CSRF token has expired');
    // Clean up expired token
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
    return false;
  }

  // Use timing-safe comparison (best effort in JS)
  // Note: In production, this should be done server-side
  if (token.length !== storedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get the current CSRF token without generating a new one
 * Returns null if no valid token exists
 */
export function getCsrfToken(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  const storedExpiry = sessionStorage.getItem(CSRF_TOKEN_EXPIRY_KEY);

  if (!storedToken || !storedExpiry) {
    return null;
  }

  const expiry = parseInt(storedExpiry, 10);
  if (Date.now() > expiry) {
    // Clean up expired token
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
    return null;
  }

  return storedToken;
}

/**
 * Clear the CSRF token from storage
 */
export function clearCsrfToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
  }
}