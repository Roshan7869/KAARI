'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  GripVertical, Plus, Trash2, ChevronUp, ChevronDown,
  Eye, EyeOff, Save, RotateCcw, Loader2, Search, Tv2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { resolveProductImageUrl } from '@/lib/product-media';

// ── Types ───────────────────────────────────────────────────────────
interface BillboardSlot {
  billboard_id?: string;
  product_id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  tag: string;
  is_active: boolean;
}

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
}

interface ApiMediaRow {
  file_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
}

interface ApiBillboardRow {
  id: string;
  product_id: string;
  display_order: number;
  tag: string | null;
  is_active: boolean;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    product_media: ApiMediaRow[];
  } | null;
}

interface SupabaseProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  product_media: ApiMediaRow[];
}

function sortMedia(media: ApiMediaRow[]): ApiMediaRow[] {
  return [...media].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

const MAX_SLOTS = 6;

// ── Admin Billboard Component ───────────────────────────────────────
export default function AdminBillboardPage() {
  const [slots, setSlots] = useState<BillboardSlot[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Product picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);

  // ── Load current billboard ───────────────────────────────────────
  const loadBillboard = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const res = await fetch('/api/admin/billboard');
      if (!res.ok) throw new Error('Failed to load billboard');
      const { data } = await res.json();
      const loaded: BillboardSlot[] = ((data ?? []) as ApiBillboardRow[]).map((row) => {
        const p = row.products;
        const media = sortMedia(p?.product_media ?? []);
        return {
          billboard_id: row.id,
          product_id: row.product_id,
          name: p?.name ?? '',
          slug: p?.slug ?? '',
          price: p?.price ?? 0,
          imageUrl: resolveProductImageUrl(media[0]?.file_path),
          tag: row.tag ?? '',
          is_active: row.is_active ?? true,
        };
      });
      setSlots(loaded);
      setDirty(false);
    } catch (err) {
      toast.error('Could not load billboard data');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => { loadBillboard(); }, [loadBillboard]);

  // ── Product search for picker ────────────────────────────────────
  useEffect(() => {
    if (!pickerOpen) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const alreadyAdded = new Set(slots.map((s) => s.product_id));
        let q = supabase
          .from('products')
          .select('id, name, slug, price, product_media(file_path, is_primary, sort_order)')
          .eq('is_active', true)
          .limit(30);

        if (searchQuery.trim()) {
          q = q.ilike('name', `%${searchQuery.trim()}%`);
        } else {
          q = q.order('created_at', { ascending: false });
        }

        const { data } = await q;
        const results: SearchProduct[] = ((data ?? []) as unknown as SupabaseProductRow[])
          .filter((p) => !alreadyAdded.has(p.id))
          .map((p) => {
            const media = sortMedia(p.product_media ?? []);
            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              imageUrl: resolveProductImageUrl(media[0]?.file_path),
            };
          });
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, pickerOpen, slots]);

  // ── Slot operations ─────────────────────────────────────────────
  function addProduct(product: SearchProduct) {
    if (slots.length >= MAX_SLOTS) {
      toast.warning(`Maximum ${MAX_SLOTS} billboard slots allowed`);
      return;
    }
    setSlots((prev) => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: product.imageUrl,
        tag: '',
        is_active: true,
      },
    ]);
    setDirty(true);
    setPickerOpen(false);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setDirty(true);
  }

  function moveDown(index: number) {
    setSlots((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setDirty(true);
  }

  function updateTag(index: number, tag: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, tag } : s)));
    setDirty(true);
  }

  function toggleActive(index: number) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, is_active: !s.is_active } : s))
    );
    setDirty(true);
  }

  // ── Save ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/billboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: slots.map((s) => ({
            product_id: s.product_id,
            tag: s.tag || null,
            is_active: s.is_active,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }

      toast.success('Billboard saved! Changes go live within 60 seconds.');
      setDirty(false);
      await loadBillboard();
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save billboard');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loadingInitial) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Tv2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-foreground">Homepage Billboard</h1>
            <p className="font-body text-sm text-muted-foreground mt-0.5">
              Control which products appear in the full-screen homepage carousel
              (up to {MAX_SLOTS} slots, refreshes every 60 s).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBillboard}
            disabled={saving}
            aria-label="Discard changes and reload"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reload
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {dirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-body text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          You have unsaved changes — click Save Changes to publish.
        </div>
      )}

      {/* Slots list */}
      <div className="space-y-3">
        {slots.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <Tv2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-body text-muted-foreground">
              No products in the billboard yet.
            </p>
            <p className="font-body text-sm text-muted-foreground/70 mt-1">
              Click &ldquo;Add Product&rdquo; to get started.
            </p>
          </div>
        )}

        {slots.map((slot, index) => (
          <div
            key={slot.product_id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              slot.is_active
                ? 'bg-card border-border'
                : 'bg-muted/50 border-dashed border-muted-foreground/30 opacity-60'
            }`}
          >
            {/* Drag handle (visual; actual reorder via buttons) */}
            <div className="text-muted-foreground/40 cursor-grab" aria-hidden>
              <GripVertical className="w-5 h-5" />
            </div>

            {/* Slot number */}
            <span className="font-body text-xs text-muted-foreground w-5 text-center shrink-0">
              {index + 1}
            </span>

            {/* Product image */}
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={slot.imageUrl || '/placeholder.svg'}
                alt={slot.name}
                fill
                className="object-cover"
                sizes="56px"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-body font-medium text-sm text-foreground truncate">{slot.name}</p>
              <p className="font-display text-xs text-primary font-bold">
                ₹{slot.price.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Tag input */}
            <div className="hidden sm:flex flex-col gap-1 w-44 shrink-0">
              <Label className="font-body text-xs text-muted-foreground">Badge label</Label>
              <Input
                value={slot.tag}
                onChange={(e) => updateTag(index, e.target.value)}
                placeholder="e.g. Bestseller"
                className="h-8 font-body text-xs"
                maxLength={20}
              />
            </div>

            {/* Active toggle */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <Label className="font-body text-xs text-muted-foreground sr-only">
                {slot.is_active ? 'Active' : 'Hidden'}
              </Label>
              <button
                onClick={() => toggleActive(index)}
                title={slot.is_active ? 'Click to hide' : 'Click to show'}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={slot.is_active ? 'Hide this slide' : 'Show this slide'}
              >
                {slot.is_active ? (
                  <Eye className="w-4 h-4 text-emerald-500" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Reorder */}
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveDown(index)}
                disabled={index === slots.length - 1}
                aria-label="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Remove */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => removeSlot(index)}
              aria-label={`Remove ${slot.name} from billboard`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add product button */}
      {slots.length < MAX_SLOTS && (
        <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setSearchQuery(''); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full rounded-xl h-12 border-dashed font-body text-sm gap-2">
              <Plus className="w-4 h-4" />
              Add Product to Billboard
              <Badge variant="secondary" className="ml-auto font-body text-xs">
                {slots.length}/{MAX_SLOTS} slots
              </Badge>
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Pick a Product</DialogTitle>
            </DialogHeader>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 font-body"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {searching && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!searching && searchResults.length === 0 && (
                <p className="text-center font-body text-sm text-muted-foreground py-8">
                  {searchQuery ? 'No products found' : 'No more products to add'}
                </p>
              )}

              {!searching && searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={product.imageUrl || '/placeholder.svg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-sm text-foreground truncate">{product.name}</p>
                    <p className="font-display text-xs text-primary font-bold">
                      ₹{product.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Help text */}
      <div className="rounded-xl bg-muted/50 p-4 space-y-1.5 font-body text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">How it works</p>
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li>Up to {MAX_SLOTS} products can be pinned to the homepage billboard carousel.</li>
          <li>Use ↑ ↓ buttons to reorder — Slot 1 is shown first when the page loads.</li>
          <li>Set a <strong>Badge label</strong> (e.g. &ldquo;Bestseller&rdquo;, &ldquo;New Arrival&rdquo;) to highlight a product.</li>
          <li>Toggle the eye icon to temporarily hide a slide without removing it.</li>
          <li>Changes go live within 60 seconds after saving (ISR cache refresh).</li>
          <li>If the billboard is empty, the homepage shows a placeholder — add at least one product.</li>
        </ul>
      </div>
    </div>
  );
}
