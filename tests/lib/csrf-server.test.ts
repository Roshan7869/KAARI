import { describe, it, expect, vi } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf-server';
import { NextRequest, NextResponse } from 'next/server';

function createMockRequest(cookieValue?: string, headerValue?: string): NextRequest {
  const headers = new Headers();
  if (headerValue) {
    headers.set(CSRF_HEADER_NAME, headerValue);
  }
  return {
    cookies: {
      get: vi.fn().mockReturnValue(cookieValue ? { value: cookieValue } : undefined),
    },
    headers,
  } as unknown as NextRequest;
}

describe('generateCsrfToken', () => {
  it('generates a token and cookie string', () => {
    const { token, cookie } = generateCsrfToken();
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(cookie).toContain(`${CSRF_COOKIE_NAME}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
  });
});

describe('validateCsrfToken', () => {
  it('returns true when cookie and header match', async () => {
    const token = 'a'.repeat(64);
    const request = createMockRequest(token, token);
    const result = await validateCsrfToken(request);
    expect(result).toBe(true);
  });

  it('returns false when cookie is missing', async () => {
    const request = createMockRequest(undefined, 'token');
    const result = await validateCsrfToken(request);
    expect(result).toBe(false);
  });

  it('returns false when header is missing', async () => {
    const request = createMockRequest('token', undefined);
    const result = await validateCsrfToken(request);
    expect(result).toBe(false);
  });

  it('returns false when neither cookie nor header is present', async () => {
    const request = createMockRequest(undefined, undefined);
    const result = await validateCsrfToken(request);
    expect(result).toBe(false);
  });

  it('returns false when lengths differ', async () => {
    const request = createMockRequest('short', 'muchlongertokenhere1234567890123456789012345678901234567890');
    const result = await validateCsrfToken(request);
    expect(result).toBe(false);
  });

  it('returns false when tokens differ (timing-safe)', async () => {
    const request = createMockRequest('a'.repeat(64), 'b'.repeat(64));
    const result = await validateCsrfToken(request);
    expect(result).toBe(false);
  });
});

describe('setCsrfCookie', () => {
  it('sets cookie with correct attributes', () => {
    const response = NextResponse.json({});
    const spy = vi.spyOn(response.cookies, 'set');
    setCsrfCookie(response, 'test-token');
    expect(spy).toHaveBeenCalledWith(CSRF_COOKIE_NAME, 'test-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });
  });
});
