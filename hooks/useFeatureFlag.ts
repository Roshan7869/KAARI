'use client';

/**
 * useFeatureFlag — reads a boolean flag from the `feature_flags` table.
 *
 * - Falls back to `defaultValue` (true) while loading or on error.
 * - Subscribes to Supabase realtime so admin toggles take effect instantly.
 *
 * Usage:
 *   const showShare = useFeatureFlag('product_share_button');
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFeatureFlag(flagKey: string, defaultValue = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Initial fetch — cast to any because feature_flags is added by migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flagKey)
      .single()
      .then(({ data }: { data: { is_enabled: boolean } | null }) => {
        if (mounted && data != null) setEnabled(data.is_enabled);
      });

    // Realtime subscription so admin panel changes propagate immediately
    const channel = supabase
      .channel(`feature-flag-${flagKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feature_flags',
          filter: `flag_key=eq.${flagKey}`,
        },
        (payload) => {
          if (mounted && payload.new && 'is_enabled' in payload.new) {
            setEnabled(payload.new.is_enabled as boolean);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [flagKey]);

  return enabled;
}

/**
 * useFeatureFlags — batch-fetch multiple flags at once.
 * Returns a Record<flagKey, boolean>.
 */
export function useFeatureFlags(
  flagKeys: string[],
  defaultValue = true,
): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>(
    () => Object.fromEntries(flagKeys.map((k) => [k, defaultValue])),
  );

  useEffect(() => {
    if (flagKeys.length === 0) return;
    const supabase = createClient();
    let mounted = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('feature_flags')
      .select('flag_key, is_enabled')
      .in('flag_key', flagKeys)
      .then(({ data }: { data: { flag_key: string; is_enabled: boolean }[] | null }) => {
        if (!mounted || !data) return;
        const map: Record<string, boolean> = { ...flags };
        data.forEach((row) => { map[row.flag_key] = row.is_enabled; });
        setFlags(map);
      });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagKeys.join(',')]);

  return flags;
}
