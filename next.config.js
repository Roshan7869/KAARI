/** @type {import('next').NextConfig} */

const withSentryConfig = require('@sentry/nextjs').withSentryConfig;

// Only load bundle analyzer when ANALYZE=true (avoids requiring uninstalled pkg)
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (/** @type {any} */ config) => config;

const nextConfig = {
  // Output standalone for Docker / containerized deployments
  output: 'standalone',

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
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
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
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui',
      'recharts',
      'framer-motion',
      'cmdk',
      'vaul',
    ],
  },

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
  // NOTE: Content-Security-Policy is set dynamically per-request in middleware.ts
  // with a unique nonce, replacing the static 'unsafe-inline' approach.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HSTS — force HTTPS for 1 year
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
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
  reactStrictMode: true,
};

// Sentry webpack plugin options — only active when SENTRY_AUTH_TOKEN is set
const sentryWebpackPluginOptions = {
  silent: true, // Suppresses all logs
  hideSourceMaps: true, // Don't upload source maps to public directory
};

// Wrap config with bundle analyzer, then Sentry
const wrappedConfig = withBundleAnalyzer(nextConfig);

module.exports = withSentryConfig(wrappedConfig, sentryWebpackPluginOptions);