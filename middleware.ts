import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// NOTE: @upstash/redis SDK uses Node.js APIs (process.version) which are NOT
// supported in the Edge Runtime. Rate limiting is handled inside API route
// handlers (Node.js environment) instead. Middleware only does auth/redirect.

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

  // API routes handle their own auth and rate limiting — skip middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

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
    '/checkout/:path*',
    '/cart/:path*',
    '/payment/:path*',
    '/order-confirmation/:path*',
    '/admin/:path*',
    '/login/:path*',
    '/signup/:path*',
  ],
}
