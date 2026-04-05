# Kaari Marketplace - Production-Ready Next.js Setup

A modern, production-ready e-commerce platform for handmade crochet products built with Next.js 14, React 18, TypeScript, and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Supabase project (free tier available)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📋 Available Scripts

```bash
npm run dev           # Start development server (port 3000)
npm run build         # Production build
npm start             # Start production server
npm run lint          # Run ESLint
npm run type-check    # TypeScript type checking
npm run test          # Run unit tests (Vitest)
npm run test:watch    # Run tests in watch mode
npm run e2e           # Run Playwright E2E tests
npm run format        # Format code with Prettier
npm run audit         # Check for vulnerable dependencies
npm run clean         # Clean build artifacts
npm run prebuild      # Run type-check and lint before building
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS
- **Auth & Database**: Supabase
- **State Management**: React Context + React Query
- **Forms**: React Hook Form + Zod validation
- **3D Graphics**: React Three Fiber + Drei
- **Animations**: Framer Motion
- **Notifications**: Sonner
- **Charts**: Recharts

### Directory Structure

```
/app                    # Next.js App Router pages and layouts
  /(auth)              # Auth-related pages
  /admin               # Admin dashboard (protected routes)
  /api                 # API routes (future: Edge Functions)
  /layout.tsx          # Root layout
  /page.tsx            # Home page

/components
  /ui                  # shadcn/ui components (50+ pre-built)
  *.tsx               # Page-specific components

/contexts              # React Context providers
  /AuthContext.tsx     # User authentication state
  /CartContext.tsx     # Shopping cart state

/lib
  /supabase           # Supabase client setup
  /analytics.ts       # GTM integration
  /config.ts          # Environment configuration
  /logger.ts          # Production-safe logging
  /payment.ts         # Dummy payment gateway
  /sanitization.ts    # Input validation & XSS prevention
  /webhook.ts         # Payment webhook handling
  /(more utilities)    # Rate limiting, Cashfree, audit logs

/hooks                # Custom React hooks
/types                # TypeScript type definitions
/public               # Static assets
/supabase             # Database migrations & schema

tsconfig.json         # TypeScript configuration
tailwind.config.ts    # Tailwind CSS configuration
next.config.ts        # Next.js configuration
middleware.ts         # Next.js middleware (auth, logging)
```

## 🔐 Security Features

- **Authentication**: Supabase Auth with session persistence
- **Input Sanitization**: XSS prevention utilities
- **Rate Limiting**: Brute force attack prevention
- **Webhook Validation**: HMAC signature verification
- **RBAC**: Role-based access control (admin role checking)
- **CORS**: Configurable cross-origin policies
- **CSP Headers**: Content Security Policy
- **SQL Injection Prevention**: Parameterized queries via Supabase

## 🗄️ Database

### Tables Overview
- `profiles` - User profile information
- `products` - Product catalog with variants
- `carts` - Shopping carts per user
- `orders` - Order records
- `payments` - Payment transaction records
- `user_roles` - Admin role assignments

### Key RPCs
- `has_role(role, user_id)` - Check if user has admin role

## 💳 Payment Integration

### Dummy Payment (Development)
- No real payment processing
- Session-based order confirmation
- Redirect: `/dummy-payment`

### Cashfree (Production)
- Real payment gateway integration
- Server-side API key handling
- Webhook signature validation
- Order status updates

## 📊 Features

### Customer Features
- ✅ Product browsing & search
- ✅ Product customization support
- ✅ Shopping cart management
- ✅ Checkout flow
- ✅ Order history
- ✅ User authentication

### Admin Features
- ✅ Product CRUD operations
- ✅ Inventory management
- ✅ Order management
- ✅ Customer management
- ✅ Analytics dashboard

### Technical Features
- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ Image optimization (Next.js Image)
- ✅ Code splitting & lazy loading
- ✅ TypeScript for type safety
- ✅ Error boundaries & error handling
- ✅ Loading states & suspense
- ✅ Form validation with Zod

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Push your code to Git
git push

# Deploy with Vercel
vercel deploy

# Set environment variables in Vercel dashboard
# Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.
```

### Docker
```bash
# Build Docker image
docker build -t kaari-marketplace .

# Run container
docker run -e NODE_ENV=production kaari-marketplace:latest
```

### Self-Hosted
```bash
npm run build
npm start
```

## 📝 Environment Variables

### Required (Development)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PROJECT_ID
```

### Optional
```
NEXT_PUBLIC_APP_URL              # App URL (default: http://localhost:3000)
NEXT_PUBLIC_ENABLE_ANALYTICS     # Enable Google Tag Manager
NEXT_PUBLIC_CASHFREE_TEST_MODE   # Test mode for Cashfree
SUPABASE_SERVICE_KEY             # Server-side Supabase operations
```

See `.env.local.example` for complete list.

## 🧪 Testing

### Unit Tests
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npx vitest run specific-test-file
```

### E2E Tests
```bash
npm run e2e           # Run Playwright tests
npm run e2e:ui        # Run with Playwright UI
```

## 📱 Performance

### Core Web Vitals Targets
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Optimization Techniques
- Image optimization with Next.js Image
- Code splitting and lazy loading
- CSS-in-JS with Tailwind (tree-shaking)
- React Query caching
- Server-side rendering for critical content
- Static generation where possible

## 🔧 Development

### Coding Standards
- Use TypeScript (strict mode)
- Follow ESLint rules
-Format with Prettier
- Write unit tests for business logic
- Document complex functions

### Branching Strategy
```
main               # Production (deployed to Vercel)
├── staging        # Staging environment
└── develop        # Development branch
    └── feature/*  # Feature branches
```

### Commit Messages
```
Type(scope): Description

# Types: feat, fix, docs, style, refactor, test, chore
# Example: feat(cart): Add item quantity validation
```

## 🐛 Debugging

### Development Tools
- React Developer Tools browser extension
- Next.js debug overlay (on errors)
- TypeScript error checking
- ESLint real-time feedback

### Logging
```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug info');      // Dev only
logger.info('Info message');     // Dev only
logger.warn('Warning message');  // Always shown
logger.error('Error message');   // Dev shown, silent in prod
```

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'feat(feature): description'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📖 Migration Notes

This project has been migrated from Vite + React to Next.js 14:

### Key Changes
- ❌ Removed: Vite, React Router, Vitest integration
- ✅ Added: Next.js App Router, API routes, Edge Functions support
- ✅ Improved: Server-side rendering, image optimization, built-in testing
- ✅ Enhanced: TypeScript strict mode, production-ready configuration

### Compatibility
- All existing components work with minimal changes
- Contexts (Auth, Cart) fully migrated
- All utilities copied and adapted
- Database schema unchanged

## 📞 Support

For issues or questions:
1. Check existing documentation
2. Review Next.js error messages
3. Check Supabase error logs
4. Create an issue with reproduction steps

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for handmade crochet excellence**
