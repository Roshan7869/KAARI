import { headers } from 'next/headers';
import { APP_URL } from '@/lib/metadata';

interface ProductJsonLdProps {
  name: string;
  description: string;
  price: number;
  image: string;
  slug: string;
  isActive: boolean;
  rating?: number;
  reviewCount?: number;
}

export async function ProductJsonLd({
  name,
  description,
  price,
  image,
  slug,
  isActive,
  rating,
  reviewCount,
}: ProductJsonLdProps) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url: `${APP_URL}/products/${slug}`,
    brand: {
      '@type': 'Brand',
      name: 'Kaari Handmade',
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'INR',
      availability: isActive
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${APP_URL}/products/${slug}`,
      seller: {
        '@type': 'Organization',
        name: 'Kaari Handmade',
      },
    },
    ...(rating != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount ?? 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
