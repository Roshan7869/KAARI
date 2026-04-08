import { auth } from '@clerk/nextjs/server'

/**
 * Get the current user from Clerk session.
 * Returns a minimal user object compatible with existing callers.
 */
export async function getUser() {
  const { userId } = await auth()
  if (!userId) return null
  return { id: userId, user_metadata: {} as Record<string, unknown>, app_metadata: {} as Record<string, unknown> }
}

/**
 * Require authentication — throws if not signed in.
 */
export async function requireAuth() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized: User not authenticated')
  }
  return { id: userId }
}

/**
 * Require admin role (Clerk publicMetadata.role === 'admin').
 */
export async function requireAdmin() {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    throw new Error('Unauthorized: User not authenticated')
  }
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  if (role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return { id: userId }
}
