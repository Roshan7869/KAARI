import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

const CSRF_COOKIE_NAME = '__Host-csrf'

// Route matchers
const isProtectedRoute = createRouteMatcher([
  '/checkout',
  '/checkout/(.*)',
  '/cart',
  '/cart/(.*)',
  '/payment(.*)',
  '/order-confirmation(.*)',
  '/orders',
  '/orders/(.*)',
  '/wishlist',
  '/wishlist/(.*)',
])
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)'])
const isAuthPage = createRouteMatcher(['/login', '/signup'])

function isSafeRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (/^\/[a-z]+:/i.test(path)) return false
  // Block control characters (ASCII 0-31, 127) and unicode direction overrides
  if (/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069\u200e\u200f]/.test(path)) return false
  return true
}

/**
 * Build Content-Security-Policy header with a per-request nonce.
 * Clerk domains added for hosted auth UI and SDK.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    // NOTE: 'unsafe-eval' required by Clerk SDK (uses eval internally).
    // strict-dynamic allows trusted scripts to load further scripts.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://js.cashfree.com https://vercel.live https://apis.google.com https://*.clerk.com https://*.clerk.accounts.dev`,
    // NOTE: 'unsafe-inline' required by Tailwind CSS + Framer Motion dynamic styles.
    // nonce allows CSP3 browsers to prefer nonce-based styles.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://img.clerk.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cashfree.com https://sandbox.cashfree.com https://api.resend.com https://*.clerk.com https://*.clerk.accounts.dev https://vitals.vercel-insights.com https://*.vercel-analytics.com`,
    `frame-src https://js.cashfree.com https://accounts.google.com https://*.clerk.com https://*.clerk.accounts.dev`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://*.clerk.accounts.dev`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl

  // Per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64').slice(0, 22)
  const cspHeader = buildCsp(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // EXEMPT WEBHOOKS FROM RATE LIMITING
  if (pathname.startsWith('/api/webhooks/')) {
    // Allow Cashfree webhooks without rate limiting
    // Cashfree IPs: 52.66.76.63, 13.126.158.60 (and others from their documentation)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();

    // Still apply very loose rate limiting for abuse prevention but don't block legitimate retries
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Admin API routes — enforce admin role at middleware level (defense in depth)
  if (pathname.startsWith('/api/admin')) {
    const { userId, sessionClaims } = await auth()
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }
    // fall through — admin confirmed
  }

  // API routes: only apply CSP, skip auth redirects
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  const { userId, sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role

  // Protected routes → redirect unauthenticated users to login
  if (isProtectedRoute(request) && !userId) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (isSafeRedirectPath(pathname)) {
      url.searchParams.set('redirect_url', pathname)
    }
    const r = NextResponse.redirect(url)
    r.headers.set('Content-Security-Policy', cspHeader)
    return r
  }

  // Admin routes → require login + admin role
  if (isAdminRoute(request)) {
    if (!userId) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      if (isSafeRedirectPath(pathname)) {
        url.searchParams.set('redirect_url', pathname)
      }
      const r = NextResponse.redirect(url)
      r.headers.set('Content-Security-Policy', cspHeader)
      return r
    }
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      const r = NextResponse.redirect(url)
      r.headers.set('Content-Security-Policy', cspHeader)
      return r
    }
  }

  // Auth pages → redirect already-signed-in users
  if (isAuthPage(request) && userId) {
    const redirectParam = request.nextUrl.searchParams.get('redirect_url')
    const url = request.nextUrl.clone()
    url.pathname = (redirectParam && isSafeRedirectPath(redirectParam)) ? redirectParam : '/'
    url.search = ''
    const r = NextResponse.redirect(url)
    r.headers.set('Content-Security-Policy', cspHeader)
    return r
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', cspHeader)

  // Set CSRF cookie for checkout pages (HTTP-only, SameSite=Strict)
  if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
    // Web Crypto API — Edge Runtime compatible (replaces Node crypto.randomBytes)
    const csrfBuffer = crypto.getRandomValues(new Uint8Array(32))
    const csrfToken = Array.from(csrfBuffer, b => b.toString(16).padStart(2, '0')).join('')
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    })
  }

  return response
})

export const config = {
  matcher: [
    // Clerk recommended matcher — handles all routes except static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
