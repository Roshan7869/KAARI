import { MetadataRoute } from 'next';
import { createServerClient } from '@supabase/ssr';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.KAARI_BASE_URL?.trim() ?? 'https://kaari.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all active product slugs from database
  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    productRoutes = (products ?? []).map((p) => ({
      url:             `${BASE_URL}/products/${p.slug}`,
      lastModified:    new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority:        0.8,
    }));
  } catch {
    // Silently fall back to static routes if DB unavailable during build
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                            lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/products`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/about`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/legal/terms`,           lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE_URL}/legal/privacy`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE_URL}/legal/refund`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE_URL}/legal/shipping`,        lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE_URL}/legal/cancellation`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
  ];

  return [...staticRoutes, ...productRoutes];
}
