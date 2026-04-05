import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

// Route matchers
const isProtectedRoute = createRouteMatcher([
  '/checkout',
  '/checkout/(.*)',
  '/cart',
  '/cart/(.*)',
  '/payment(.*)',
  '/order-confirmation(.*)',
])
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)'])
const isAuthPage = createRouteMatcher(['/login', '/signup'])

function isSafeRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/') || path.startsWith('//')) return false
  if (/^\/[a-z]+:/i.test(path)) return false
  return true
}

/**
 * Build Content-Security-Policy header with a per-request nonce.
 * Clerk domains added for hosted auth UI and SDK.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.cashfree.com https://vercel.live https://apis.google.com https://*.clerk.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://img.clerk.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cashfree.com https://sandbox.cashfree.com https://api.resend.com https://*.clerk.com https://*.clerk.accounts.dev`,
    `frame-src https://js.cashfree.com https://accounts.google.com https://*.clerk.com https://*.clerk.accounts.dev`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
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
  return response
})

export const config = {
  matcher: [
    // Clerk recommended matcher — handles all routes except static assets
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
