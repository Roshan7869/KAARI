import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Update session for Supabase auth
  const response = await updateSession(request)

  // Protected routes that require authentication
  const protectedRoutes = ['/checkout', '/cart', '/order-confirmation']
  const adminRoutes = ['/admin']

  const pathname = request.nextUrl.pathname

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute || isAdminRoute) {
    const authToken = request.cookies.get('sb-auth-token')?.value

    if (!authToken) {
      // Redirect to login with return URL
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Admin routes require additional checks (role verification)
  // This is done in API routes via has_role() RPC
  if (isAdminRoute) {
    // Additional security: log admin access attempts
    console.log(`[ADMIN ACCESS] ${pathname} from ${request.ip}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
