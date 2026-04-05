import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/profile', '/orders']

// Admin-only routes
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute || isAdminRoute) {
    // Create a response to clone
    const response = NextResponse.next()

    // Create a Supabase client to access auth and database
    const supabase = createMiddlewareClient({ req: request, res: response })

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session and trying to access protected route, redirect to login
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // For admin routes, check if user has admin role
    if (isAdminRoute) {
      try {
        // Check user role from database (you'll need to implement this based on your schema)
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()

        if (!userRole || userRole.role !== 'admin') {
          // User doesn't have admin access, redirect to home
          return NextResponse.redirect(new URL('/', request.url))
        }
      } catch (error) {
        console.error('[v0] Error checking admin role:', error)
        // On error, redirect to home for safety
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
