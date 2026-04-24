import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/verify-jwt';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger-server';
import { resolveProductImageUrl } from '@/lib/product-media';

const SearchSchema = z.object({
  q: z.string().optional(),
  exclude: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

interface ProductResult {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  imageUrl: string;
}

interface ProductMediaRow {
  file_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
}

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  product_media: ProductMediaRow[];
}

function sortMedia(media: ProductMediaRow[]): ProductMediaRow[] {
  return [...media].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminErr = await requireAdmin();
    if (adminErr) return adminErr;

    const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = SearchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const q = parsed.data.q?.trim();
    const excluded = new Set(
      (parsed.data.exclude ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );

    const admin = createAdminClient();
    let query = admin
      .from('products')
      .select('id, title, slug, base_price, product_media(file_path, is_primary, sort_order)')
      .eq('is_active', true)
      .limit(parsed.data.limit);

    if (q) {
      const sanitized = q.replace(/[%_]/g, '\\$&');
      query = query.ilike('title', `%${sanitized}%`);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      logger.error('Billboard product search failed', { error });
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    const products: ProductResult[] = ((data ?? []) as unknown as ProductRow[])
      .filter((row) => !excluded.has(row.id))
      .map((row) => {
        const media = sortMedia(row.product_media ?? []);
        return {
          id: row.id,
          title: row.title,
          slug: row.slug,
          base_price: row.base_price,
          imageUrl: resolveProductImageUrl(media[0]?.file_path),
        };
      });

    return NextResponse.json({ products });
  } catch (error) {
    logger.error('Admin billboard search GET failed', { error });
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
