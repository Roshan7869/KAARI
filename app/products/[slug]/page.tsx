import { Metadata } from "next";
import ProductDetail from "@/components/pages/ProductDetail";
import { createClient } from "@/lib/supabase/server";
import { createClient as createStaticClient } from "@supabase/supabase-js";
import { ProductJsonLd } from "@/components/products/ProductJsonLd";

// ISR: revalidate product detail pages every 60 seconds
export const revalidate = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in';

export async function generateStaticParams() {
  try {
    // Use a cookie-free client — generateStaticParams has no request scope
    const supabase = createStaticClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: products, error } = await supabase
      .from("products")
      .select("slug")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching products for generateStaticParams:", error);
      return [];
    }

    return ((products ?? []) as { slug: string }[]).map((product) => ({
      slug: product.slug,
    }));
  } catch (err) {
    console.error("generateStaticParams error:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = createStaticClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: product } = await supabase
      .from('products')
      .select('title, description, base_price, compare_at_price, average_rating, review_count')
      .eq('slug', slug)
      .single();

    // Fetch primary image
    let imageUrl = `${APP_URL}/og-image.jpg`;
    if (product) {
      const { data: media } = await supabase
        .from('product_media')
        .select('file_path')
        .eq('product_id', (product as { id?: string }).id ?? '')
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();
      if (media?.file_path?.startsWith('http')) imageUrl = media.file_path;
    }

    const title = (product as { title?: string } | null)?.title
      ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const description = (product as { description?: string | null } | null)?.description
      ?? `Handmade crochet ${title}. Unique, artisan-crafted piece made with love.`;

    return {
      title: `${title} | Kaari - Handmade Crochet Marketplace`,
      description,
      openGraph: {
        type: 'article',
        url: `${APP_URL}/products/${slug}`,
        title: `${title} | Kaari`,
        description,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: `${title} - Handmade Crochet` }],
      },
      robots: { index: true, follow: true },
    };
  } catch {
    const productTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `${productTitle} | Kaari - Handmade Crochet Marketplace`,
      description: `Handmade crochet ${productTitle}. Unique, artisan-crafted piece made with love.`,
      openGraph: {
        type: 'article',
        url: `${APP_URL}/products/${slug}`,
        title: `${productTitle} | Kaari`,
        description: `Handmade crochet ${productTitle}. Unique, artisan-crafted piece.`,
        images: [{ url: `${APP_URL}/og-image.jpg`, width: 1200, height: 630, alt: `${productTitle} - Handmade Crochet` }],
      },
      robots: { index: true, follow: true },
    };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // Minimal fetch for JSON-LD (ProductDetail fetches full data client-side)
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('id, title, description, base_price, slug, is_active')
    .eq('slug', params.slug)
    .single() as unknown as { data: { id: string; title: string; description: string | null; base_price: number; slug: string; is_active: boolean | null } | null };

  return (
    <>
      {product && (
        <ProductJsonLd
          name={product.title}
          description={product.description ?? ''}
          price={product.base_price}
          image={`${APP_URL}/og-image.jpg`}
          slug={product.slug}
          isActive={product.is_active ?? true}
        />
      )}
      <ProductDetail />
    </>
  );
}
