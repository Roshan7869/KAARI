import { createClient } from '@/lib/supabase/server';
import { resolveProductImageUrl } from '@/lib/product-media';

export interface BillboardProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  tag: string | null;
  imageUrl: string;
  displayOrder: number;
}

export interface ShowcaseProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  tag: string | null;
}

interface MediaRow {
  file_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
}

interface RawBillboardRow {
  id: string;
  display_order: number;
  tag: string | null;
  custom_image_url: string | null;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    description: string | null;
    product_media: MediaRow[];
  } | null;
}

interface RawProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  product_media: MediaRow[];
}

function pickBestImage(media: MediaRow[]): string {
  if (!media?.length) return '';
  return [...media]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })[0]?.file_path ?? '';
}

// ── Homepage billboard (admin-curated) ─────────────────────────────
export async function getBillboardProducts(): Promise<BillboardProduct[]> {
  const supabase = await createClient();

  // `billboard_products` table added via migration — not yet in auto-generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('billboard_products')
    .select(`
      id,
      display_order,
      tag,
      custom_image_url,
      product_id,
      products (
        id,
        name,
        slug,
        price,
        description,
        product_media ( file_path, is_primary, sort_order )
      )
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(6);

  if (error || !data) return [];

  return (data as RawBillboardRow[])
    .filter((row) => row.products !== null)
    .map((row) => {
      const p = row.products!;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        description: p.description ?? '',
        tag: row.tag,
        imageUrl: row.custom_image_url
          ? resolveProductImageUrl(row.custom_image_url)
          : resolveProductImageUrl(pickBestImage(p.product_media ?? [])),
        displayOrder: row.display_order,
      };
    });
}

// ── Product showcase grid (latest products) ─────────────────────────
export async function getShowcaseProducts(limit = 8): Promise<ShowcaseProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      price,
      product_media ( file_path, is_primary, sort_order )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as RawProductRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    imageUrl: resolveProductImageUrl(pickBestImage(p.product_media ?? [])),
    tag: null,
  }));
}
