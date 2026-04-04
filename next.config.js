/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json',
  },

  // ESLint configuration
  eslint: {
    dirs: ['app', 'components', 'contexts', 'hooks', 'lib'],
  },

  // Image optimization - comprehensive setup
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  swcMinify: true,

  // Redirects
  async redirects() {
    return [
      {
        source: '/dummy-payment',
        destination: '/checkout',
        permanent: true,
      },
      {
        source: '/dummy-payment-success',
        destination: '/order-confirmation',
        permanent: false,
      },
      {
        source: '/checkout-success',
        destination: '/order-confirmation',
        permanent: false,
      },
    ];
  },

  // Security headers & cache control
  async headers() {
    const ContentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.cashfree.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://*.cloudinary.com https://images.unsplash.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cashfree.com https://sandbox.cashfree.com https://api.resend.com",
      "frame-src https://js.cashfree.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          // HSTS — force HTTPS for 1 year
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // CSP — strict, blocks XSS injection vectors
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy - restrict sensitive APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
          // Cache control for static pages
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, private',
          },
        ],
      },
      // Product pages — ISR cache headers
      {
        source: '/products/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      // Static assets — immutable long-term cache
      {
        source: '/:path*\\.(jpg|jpeg|png|webp|avif|svg|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Remove powered by header
  poweredByHeader: false,

  // React strict mode for development
  reactStrictMode: process.env.NODE_ENV === 'development',

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui',
    ],
  },
};

module.exports = nextConfig;
