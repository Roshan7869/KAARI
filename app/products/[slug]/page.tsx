import { Metadata } from "next";
import ProductDetail from "@/components/pages/ProductDetail";
import { createClient } from "@/lib/supabase/server";

// ISR: revalidate product detail pages every 60 seconds
export const revalidate = 60;

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
      url: `https://kaari.in/products/${slug}`,
      title: `${productTitle} | Kaari`,
      description: `Handmade crochet ${productTitle}. Unique, artisan-crafted piece.`,
      images: [
        {
          url: `https://kaari.in/products/${slug}/image.jpg`,
          width: 800,
          height: 800,
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

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return <ProductDetail />;
}
