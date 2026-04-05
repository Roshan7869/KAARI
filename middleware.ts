import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// NOTE: @upstash/redis SDK uses Node.js APIs (process.version) which are NOT
// supported in the Edge Runtime. Rate limiting is handled inside API route
// handlers (Node.js environment) instead. Middleware only does auth/redirect + CSP.

const PROTECTED_PATHS = ['/checkout', '/cart', '/payment', '/order-confirmation']
const AUTH_PAGES = ['/login', '/signup']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

/**
 * SECURITY: Validate redirect target is a safe internal path (no open redirect).
 * Only allows relative paths starting with / and not // (protocol-relative URLs).
 */
function isSafeRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (/^\/[a-z]+:/i.test(path)) return false
  return true
}

/**
 * Build Content-Security-Policy header with a per-request nonce.
 * 'strict-dynamic' means scripts loaded by nonced scripts are also trusted,
 * which handles Next.js's dynamically injected chunks.
 * 'unsafe-inline' is ignored by browsers that understand nonces — kept as
 * fallback only for older browsers.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.cashfree.com https://vercel.live https://apis.google.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cashfree.com https://sandbox.cashfree.com https://api.resend.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com`,
    `frame-src https://js.cashfree.com https://accounts.google.com https://*.firebaseapp.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── NONCE + CSP (all HTML routes) ─────────────────────────────────────────
  // crypto.randomUUID() is available in the Edge Runtime
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64').slice(0, 22)
  const cspHeader = buildCsp(nonce)

  // Inject nonce into request headers so Server Components can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // API routes handle their own auth and rate limiting — skip auth checks
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  // ── SUPABASE AUTH ──────────────────────────────────────────────────────────
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): { name: string; value: string }[] {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { httpOnly?: boolean; sameSite?: boolean; path?: string } }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes — redirect to login preserving safe destination
  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    if (isSafeRedirectPath(pathname)) {
      redirectUrl.searchParams.set('next', pathname)
    }
    const redirectResponse = NextResponse.redirect(redirectUrl)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  // Admin routes — require authenticated admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      if (isSafeRedirectPath(pathname)) {
        redirectUrl.searchParams.set('next', pathname)
      }
      const redirectResponse = NextResponse.redirect(redirectUrl)
      redirectResponse.headers.set('Content-Security-Policy', cspHeader)
      return redirectResponse
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      redirectResponse.headers.set('Content-Security-Policy', cspHeader)
      return redirectResponse
    }
  }

  // Auth pages — redirect already-logged-in users, with safe next param validation
  if (isAuthPage(pathname) && user) {
    const nextParam = request.nextUrl.searchParams.get('next')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = (nextParam && isSafeRedirectPath(nextParam)) ? nextParam : '/'
    redirectUrl.search = ''
    const redirectResponse = NextResponse.redirect(redirectUrl)
    redirectResponse.headers.set('Content-Security-Policy', cspHeader)
    return redirectResponse
  }

  // Apply CSP to the final response
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

export const config = {
  matcher: [
    // Apply to ALL HTML pages; exclude static assets and prefetch requests
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
