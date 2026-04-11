'use client';

/**
 * /admin/settings/features — Feature Flag control panel.
 * Shows all flags grouped by flag_group with Switch toggles.
 * Persists changes to Supabase + logs to admin_activity_log.
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_label: string;
  flag_group: string;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  updated_at: string | null;
}

// ── Group order + labels ─────────────────────────────────────────────────

const GROUP_ORDER = ['homepage', 'navigation', 'products', 'checkout', 'storefront'];
const GROUP_LABELS: Record<string, string> = {
  homepage: '🏠 Homepage',
  navigation: '🧭 Navigation',
  products: '🧶 Products',
  checkout: '🛒 Checkout',
  storefront: '🏪 Storefront',
};

// ── Toggle Switch ─────────────────────────────────────────────────────────

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1F2A] focus-visible:ring-offset-2',
        checked ? 'bg-[#8B1F2A]' : 'bg-stone-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // ── Fetch all flags ────────────────────────────────────────────────────

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from('feature_flags')
      .select('id, flag_key, flag_label, flag_group, is_enabled, config, updated_at')
      .order('flag_group')
      .order('flag_label') as { data: FeatureFlag[] | null; error: { message: string } | null };
    if (err) { setError(err.message); setLoading(false); return; }
    setFlags(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  // ── Toggle a flag ──────────────────────────────────────────────────────

  const handleToggle = async (flag: FeatureFlag) => {
    const newValue = !flag.is_enabled;
    const supabase = createClient();

    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: newValue } : f)),
    );
    setSaving((s) => new Set(s).add(flag.id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('feature_flags')
      .update({ is_enabled: newValue, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq('id', flag.id) as { error: { message: string } | null };

    if (updateErr) {
      // Roll back
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: flag.is_enabled } : f)),
      );
      setError(`Failed to update "${flag.flag_label}": ${updateErr.message}`);
    } else {
      // Log to activity log (best-effort)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('admin_activity_log').insert({
        admin_id: user?.id ?? null,
        action: 'UPDATE',
        entity_type: 'feature_flag',
        entity_id: flag.id,
        entity_label: flag.flag_key,
        before_state: { is_enabled: flag.is_enabled },
        after_state: { is_enabled: newValue },
      });
      setLastSaved(`"${flag.flag_label}" ${newValue ? 'enabled' : 'disabled'}`);
      setTimeout(() => setLastSaved(null), 3000);
    }

    setSaving((s) => { const next = new Set(s); next.delete(flag.id); return next; });
  };

  // ── Group flags ────────────────────────────────────────────────────────

  const grouped = GROUP_ORDER.reduce<Record<string, FeatureFlag[]>>((acc, g) => {
    acc[g] = flags.filter((f) => f.flag_group === g);
    return acc;
  }, {});
  // Add any unknown groups at the end
  flags.forEach((f) => {
    if (!GROUP_ORDER.includes(f.flag_group)) {
      grouped[f.flag_group] = grouped[f.flag_group] ?? [];
      grouped[f.flag_group].push(f);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1f0407]">Feature Controls</h1>
        <p className="mt-1 text-sm text-stone-500">
          Toggle features on or off across the store. Changes take effect instantly for new page loads.
        </p>
      </div>

      {/* Toast */}
      {lastSaved && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
          <span>✓</span> {lastSaved}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .filter(([, items]) => items.length > 0)
            .map(([group, items]) => (
              <section key={group}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
                  {GROUP_LABELS[group] ?? group}
                </h2>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                  {items.map((flag) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-[#1f0407]">{flag.flag_label}</p>
                        <p className="text-xs text-stone-400 font-mono mt-0.5">{flag.flag_key}</p>
                      </div>
                      <Switch
                        checked={flag.is_enabled}
                        onChange={() => handleToggle(flag)}
                        disabled={saving.has(flag.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
