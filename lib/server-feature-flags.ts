/**
 * server-feature-flags.ts — server-side feature flag utilities.
 *
 * Use inside Server Components, Route Handlers, and generateMetadata.
 * Does NOT include Realtime (server-side is one-shot SSR).
 *
 * Example (Server Component):
 *   import { getFlag, getFlags } from '@/lib/server-feature-flags';
 *   const showRelated = await getFlag('product_related_section', true);
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Read a single feature flag on the server.
 * Returns `defaultValue` when flag does not exist or on DB error.
 */
export async function getFlag(flagKey: string, defaultValue = true): Promise<boolean> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flagKey)
      .single() as { data: { is_enabled: boolean } | null; error: unknown };
    if (error || data == null) return defaultValue;
    return data.is_enabled;
  } catch {
    return defaultValue;
  }
}

/**
 * Read multiple feature flags in a single query.
 * Returns a Record<flagKey, boolean>.  Missing keys get `defaultValue`.
 */
export async function getFlags(
  flagKeys: string[],
  defaultValue = true,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = Object.fromEntries(
    flagKeys.map((k) => [k, defaultValue]),
  );
  if (flagKeys.length === 0) return result;

  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('feature_flags')
      .select('flag_key, is_enabled')
      .in('flag_key', flagKeys) as { data: { flag_key: string; is_enabled: boolean }[] | null };

    if (data) {
      data.forEach((row) => {
        result[row.flag_key] = row.is_enabled;
      });
    }
  } catch {
    // Return defaults on error
  }
  return result;
}

/**
 * Read all flags in a group.
 */
export async function getFlagsByGroup(
  group: string,
): Promise<Record<string, boolean>> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('feature_flags')
      .select('flag_key, is_enabled')
      .eq('flag_group', group) as { data: { flag_key: string; is_enabled: boolean }[] | null };

    if (!data) return {};
    return Object.fromEntries(
      data.map((row) => [row.flag_key, row.is_enabled]),
    );
  } catch {
    return {};
  }
}
