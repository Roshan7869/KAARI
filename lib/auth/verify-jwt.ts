import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Get the current user from the JWT token
 * This validates the JWT server-side without making a DB call
 * @returns The user object or null if not authenticated
 */
export async function getUser() {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for server-side
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user:', error)
    return null
  }

  return user
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    throw new Error('Unauthorized: User not authenticated')
  }
  return user
}

/**
 * Check if user has admin role
 */
export async function requireAdmin() {
  const user = await requireAuth()

  // Check for admin role in user metadata
  const userRole = user.user_metadata?.role
  const appRole = user.app_metadata?.role

  if (userRole !== 'admin' && appRole !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  return user
}
