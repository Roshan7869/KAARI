import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Create the Supabase client without explicit type parameters
// The Database type will be inferred from the URL/key initialization
// Using a type assertion to ensure the client is properly typed
const client = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) as unknown as SupabaseClient<Database>

// Singleton instance for use in client components
export const supabase = client

// Factory function to create a new client instance
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}