import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token, set it as an HTTP-only cookie, and return it.
 * Call this on the page that renders the checkout form (server component).
 */
export function generateCsrfToken(): { token: string; cookie: string } {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const cookie = `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`;
  return { token, cookie };
}

/**
 * Validate a CSRF token from a request.
 * Reads the __Host-csrf cookie and compares it to the X-CSRF-Token header
 * using a timing-safe comparison to prevent timing attacks.
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Timing-safe comparison
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Create a response that sets the CSRF cookie.
 * Use this in the checkout page server component to set the token.
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
  });
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };