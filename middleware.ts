import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { applyRateLimit } from '@/lib/server-rate-limit'

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Rate limiting ─────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isAuth    = pathname.startsWith('/api/auth')
    const isWebhook = pathname.startsWith('/api/webhooks')
    const limiterKey = isAuth ? 'auth' : isWebhook ? 'webhook' : 'api'
    // Auth + webhooks fail CLOSED (deny if Redis is down — brute-force protection)
    const failClosed = isAuth || isWebhook
    const rateLimitResponse = await applyRateLimit(request, limiterKey, failClosed)
    if (rateLimitResponse) return rateLimitResponse
    // API routes handle their own auth — skip middleware auth checks
    return NextResponse.next({ request })
  }

  // Rate-limit page routes that are abuse-prone
  if (pathname === '/checkout') {
    // Checkout fails open — Redis outage should not block legitimate purchases
    const rateLimitResponse = await applyRateLimit(request, 'checkout', false)
    if (rateLimitResponse) return rateLimitResponse
  }

  if (pathname === '/login' || pathname === '/signup') {
    // Auth pages fail OPEN — Supabase has its own brute-force protection; Redis is optional
    const rateLimitResponse = await applyRateLimit(request, 'auth', false)
    if (rateLimitResponse) return rateLimitResponse
  }
  // ───────────────────────────────────────────────────────────────────────

  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
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
    return NextResponse.redirect(redirectUrl)
  }

  // Admin routes — require authenticated admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      if (isSafeRedirectPath(pathname)) {
        redirectUrl.searchParams.set('next', pathname)
      }
      return NextResponse.redirect(redirectUrl)
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
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Auth pages — redirect already-logged-in users, with safe next param validation
  if (isAuthPage(pathname) && user) {
    const nextParam = request.nextUrl.searchParams.get('next')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = (nextParam && isSafeRedirectPath(nextParam)) ? nextParam : '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',           // Rate limiting on all API routes
    '/checkout/:path*',
    '/cart/:path*',
    '/payment/:path*',
    '/order-confirmation/:path*',
    '/admin/:path*',
    '/login/:path*',
    '/signup/:path*',
  ],
}
