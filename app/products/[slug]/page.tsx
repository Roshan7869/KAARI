import { Metadata } from "next";
import ProductDetail from "@/components/pages/ProductDetail";
import { createClient } from "@/lib/supabase/server";
import { ProductJsonLd } from "@/components/products/ProductJsonLd";

// ISR: revalidate product detail pages every 60 seconds
export const revalidate = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in';

export async function generateStaticParams() {
  try {
    const supabase = await createClient();
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
  const productTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${productTitle} | Kaari - Handmade Crochet Marketplace`,
    description: `Handmade crochet ${productTitle}. Unique, artisan-crafted piece made with love.`,
    openGraph: {
      type: "article",
      url: `${APP_URL}/products/${slug}`,
      title: `${productTitle} | Kaari`,
      description: `Handmade crochet ${productTitle}. Unique, artisan-crafted piece.`,
      images: [
        {
          url: `${APP_URL}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `${productTitle} - Handmade Crochet`,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
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
    .select('name, description, base_price, slug, is_active')
    .eq('slug', params.slug)
    .single() as unknown as { data: { name: string; description: string | null; base_price: number; slug: string; is_active: boolean | null } | null };

  return (
    <>
      {product && (
        <ProductJsonLd
          name={product.name}
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
