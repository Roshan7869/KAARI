import type { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// Type helper to properly type the Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Type helper for select queries - extracts Row type from a table
export type SelectQuery<TableName extends keyof Database['public']['Tables']> = Database['public']['Tables'][TableName]['Row'];

// Type helper for insert operations - extracts Insert type from a table
export type InsertQuery<TableName extends keyof Database['public']['Tables']> = Database['public']['Tables'][TableName]['Insert'];

// Type helper for update operations - extracts Update type from a table
export type UpdateQuery<TableName extends keyof Database['public']['Tables']> = Database['public']['Tables'][TableName]['Update'];

// Helper to type a Supabase select result
export type SupabaseResult<T> = {
  data: T | null;
  error: Error | null;
};
