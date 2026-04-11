import { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
