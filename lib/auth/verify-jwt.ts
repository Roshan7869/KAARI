import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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
 * Returns a NextResponse (401/403) if the check fails, or null if it passes.
 * Usage: const adminErr = await requireAdmin(); if (adminErr) return adminErr;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: User not authenticated' },
      { status: 401 }
    )
  }
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  if (role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    )
  }
  return null
}