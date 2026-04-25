/**
 * Shared metadata utilities — prevents hardcoding domain in every page.tsx
 * Override NEXT_PUBLIC_APP_URL in Vercel Environment Variables for production.
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function buildOpenGraph(page: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
}) {
  return {
    type: (page.type ?? 'website') as 'website' | 'article',
    url: `${APP_URL}${page.path}`,
    title: page.title,
    description: page.description,
    siteName: 'Kaari — Handmade Crochet',
    images: [
      {
        url: page.image ?? `${APP_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: page.title,
      },
    ],
  };
}
