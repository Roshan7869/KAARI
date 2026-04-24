import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Creates a Supabase client authenticated with the current Clerk user's session.
 *
 * Uses Clerk's native Supabase integration — no JWT template required.
 * Supabase automatically fetches Clerk's public keys from your Clerk domain
 * and validates the session token, enabling RLS policies via auth.jwt().
 *
 * Returns null if the user is not authenticated.
 */
export async function createUserClient() {
  const { userId, getToken } = await auth()

  if (!userId) return null

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return getToken()
      },
    }
  )
}