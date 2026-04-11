import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeSearchQuery } from '@/lib/sanitization';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('q') ?? '';
  const q = sanitizeSearchQuery(raw).trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, title, slug, category, base_price')
    .eq('is_active', true)
    .ilike('title', `%${q}%`)
    .order('title')
    .limit(6) as unknown as { data: Array<{ id: string; title: string; slug: string; category: string | null; base_price: number }> | null; error: unknown };

  if (error) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: (p.category as string) ?? 'Uncategorized',
    price: p.base_price as number,
    type: 'product' as const,
  }));

  return NextResponse.json(
    { suggestions },
    { headers: { 'Cache-Control': 'private, max-age=30' } }
  );
}
