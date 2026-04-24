/**
 * Client-side CSRF token helper.
 * Reads the __Host-csrf cookie and returns it for use in fetch headers.
 */

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? '';
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
