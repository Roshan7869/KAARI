import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Creates a Supabase client authenticated with the current Clerk user's session.
 *
 * PREREQUISITE: Clerk Dashboard → JWT Templates must have a template named
 * "supabase" configured with:
 *   - Audience (aud): "authenticated"
 *   - Subject (sub): {{user.id}} (Clerk user ID)
 *   - Lifetime: 60 seconds (or per your security policy)
 *
 * @throws {Error} If the "supabase" JWT template is not configured in Clerk.
 *   In development: detailed setup instructions are included in the error.
 *   In production: generic "unavailable" message shown to user.
 */
export async function createUserClient() {
  const { userId, getToken } = await auth()

  if (!userId) return null

  const supabaseToken = await getToken({ template: 'supabase' })

  // CRITICAL: If token is null, the Clerk "supabase" JWT template is
  // not configured. Failing silently here causes all users to see
  // empty orders pages with no error — a dangerous production bug.
  if (!supabaseToken) {
    const isDev = process.env.NODE_ENV === 'development'
    const message = isDev
      ? '[Auth] Clerk "supabase" JWT template not configured.\n' +
        'Go to: Clerk Dashboard → JWT Templates → New template → Supabase\n' +
        'Set audience to: authenticated\n' +
        'Map sub claim to: user.id'
      : 'Authentication service temporarily unavailable. Please sign out and sign back in.'
    throw new Error(message)
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${supabaseToken}` },
      },
    }
  )
}