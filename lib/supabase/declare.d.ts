import type { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import type { CreateBrowserClientOptions, CreateServerClientOptions } from '@supabase/ssr';

// Augment the module to ensure proper type resolution
declare module '@supabase/supabase-js' {
  // This ensures that when we call createClient with <Database>,
  // the type is properly resolved
  export function createServerClient<DB = Database>(
    url: string,
    key: string,
    options: CreateServerClientOptions
  ): SupabaseClient<DB>;

  export function createBrowserClient<DB = Database>(
    url: string,
    key: string
  ): SupabaseClient<DB>;
}
