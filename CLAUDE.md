# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaari Marketplace** - A handmade crochet products e-commerce platform built with Next.js 14 App Router, TypeScript, Clerk authentication, and Supabase database. Features include product browsing, cart management, checkout flow, product customization, reviews, and admin dashboard. Currency: **INR (Indian Rupees)**.

## Common Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check (tsc --noEmit)
npm run test         # Run Vitest tests
npm run test:watch   # Run tests in watch mode
npm run e2e          # Run Playwright E2E tests
npm run e2e:ui       # Run E2E tests with UI
npm run format       # Format with Prettier
npm run analyze      # Bundle analysis (ANALYZE=true next build)
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: Clerk (with publicMetadata.role for admin role)
- **Database**: Supabase (PostgreSQL with RLS policies)
- **Storage**: Supabase Storage + Cloudinary (product images)
- **Payments**: Cashfree (UPI, cards, net banking)
- **Email**: Resend (transactional emails)
- **Rate Limiting**: Upstash Redis (server-side)
- **UI**: Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion
- **State**: React Context (AuthContext, CartContext) + TanStack Query
- **Fonts**: Playfair Display, Cormorant Garamond, Inter (Google Fonts)

## Architecture

### App Router Structure

```
app/
├── layout.tsx          # Root layout (ClerkProvider, Providers, fonts)
├── providers.tsx       # QueryClient, Auth, Cart, Tooltip providers
├── page.tsx            # Home page
├── (routes)/           # Route groups
├── admin/              # Admin routes (protected by middleware)
├── api/                # API routes (server-side logic)
├── checkout/           # Checkout flow (protected)
├── products/[slug]/    # Dynamic product pages
└── ...
```

### Provider Hierarchy

```
ClerkProvider (root layout)
  └── QueryClientProvider
        └── AuthProvider (Clerk-backed, maintains useAuth() API)
              └── CartProvider (requires user ID from auth)
                    └── TooltipProvider
                          └── Toaster/Sonner
```

**Critical**: Auth must initialize before Cart because cart operations require `user.id`.

### Authentication (Clerk)

- `middleware.ts` handles route protection with `clerkMiddleware`
- Protected routes: `/checkout`, `/cart`, `/payment`, `/order-confirmation`
- Admin routes: `/admin/*` (requires `publicMetadata.role === 'admin'`)
- Auth pages redirect logged-in users to home
- CSP headers built per-request with unique nonce

```typescript
// Check admin role (client component)
const isAdmin = (clerkUser?.publicMetadata?.role as string) === 'admin';

// Check admin role (server component/API)
import { auth } from '@clerk/nextjs/server';
const { sessionClaims } = await auth();
const isAdmin = sessionClaims?.metadata?.role === 'admin';
```

### Supabase Client Pattern

```typescript
// Client components
import { supabase } from '@/lib/supabase/client';
// Or create fresh instance
import { createClient } from '@/lib/supabase/client';

// Server components / API routes
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

### Database Tables & Relationships

```
profiles ← user_roles (admin access)
    ↓
carts → cart_items → cart_item_customizations → customization_uploads
    ↓
checkout_sessions
    ↓
orders → order_items → order_status_events
    ↓
payments

products → product_variants (stock, pricing, SKU)
         → product_media (images with sort_order)
         → reviews (customer reviews with admin approval)
```

**Key Fields**:
- `cart_items.item_type`: 'standard' | 'customized'
- `cart_item_customizations.quote_status`: 'not_needed' | 'pending' | 'approved' | 'rejected'
- `orders.status`: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
- `reviews.status`: 'pending' | 'approved' | 'rejected'

### API Routes

| Path | Method | Purpose |
|------|--------|---------|
| `/api/checkout` | POST | Create order from cart |
| `/api/payments/*` | - | Cashfree payment handling |
| `/api/webhooks/*` | POST | Payment webhooks |
| `/api/admin/*` | - | Admin operations (requires admin role) |
| `/api/reviews` | GET/POST | Product reviews CRUD |

### Route Protection (middleware.ts)

```typescript
const isProtectedRoute = createRouteMatcher([
  '/checkout', '/checkout/(.*)', '/cart', '/cart/(.*)',
  '/payment(.*)', '/order-confirmation(.*)'
]);
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)']);
const isAuthPage = createRouteMatcher(['/login', '/signup']);
```

## Import Patterns

```typescript
// Components (from components/)
import { Button } from '@/components/ui/button';

// Contexts (from contexts/)
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

// Hooks (from hooks/)
import { useAdminProducts } from '@/hooks/useAdminProducts';

// Supabase (from lib/supabase/)
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';

// Types (from types/)
import type { Database } from '@/types/database';
import type { Tables } from '@/types/database';

// Database row types
type Product = Tables<'products'>;
type CartItem = Tables<'cart_items'>;
```

## Testing

- **Vitest**: Unit tests in `__tests__/` and `test/` directories
- **Playwright**: E2E tests in `tests/` directory
- **Config**: `vitest.config.mjs`, `playwright.config.ts`

## React Query Patterns

```typescript
// Query hook with caching
const { data, isLoading } = useAdminProducts({ search, category, page });

// Mutation with cache invalidation
const mutation = useCreateProduct();
mutation.mutate(productData);

// Manual cache invalidation
queryClient.invalidateQueries({ queryKey: ['admin-products'] });
```

## Security Notes

### Middleware CSP (Critical)

Content-Security-Policy built per-request with unique nonce:
```typescript
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.cashfree.com...`,
    // ... see middleware.ts for full config
  ].join('; ')
}
```

### Clerk JWT Template (REQUIRED for order pages to work)
1. Go to Clerk Dashboard → JWT Templates
2. Click "New Template" → Choose "Supabase"
3. Set template name: `supabase` (exactly this, case-sensitive)
4. Audience (aud): `authenticated`
5. Subject (sub): `{{user.id}}`
6. Save template

**WITHOUT THIS STEP**: All authenticated users see empty orders page with no error message. The `createUserClient()` function in `lib/supabase/auth-client.ts` will throw if this template is missing.

### Environment Variables

Required in `.env.local`:
```
# App
NEXT_PUBLIC_APP_URL

# Clerk (auto-injected by Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (server-side only)

# Cashfree (server-side only)
CASHFREE_APP_ID
CASHFREE_SECRET_KEY
CASHFREE_WEBHOOK_SECRET
```

### Input Sanitization

Use utilities from `lib/sanitization.ts` and `lib/sanitize.ts`:
- `sanitizeTextInput()` - XSS prevention
- `sanitizeSearchQuery()` - SQL injection prevention
- `sanitizeUrl()` - URL validation (blocks javascript:/data:)

### Rate Limiting

- Client-side: `lib/client-rate-limit.ts`
- Server-side: `lib/server-rate-limit.ts` (Upstash Redis)

## Payment Flow

1. Checkout collects shipping/payment info
2. `/api/checkout` creates order via RPC `create_order_from_cart`
3. Cashfree payment session created (server-side)
4. Webhook at `/api/webhooks/cashfree` updates payment status
5. Order confirmation at `/order-confirmation/[orderId]`

## Admin Dashboard

- Route: `/admin/*` (protected by role check in middleware)
- Features: Products, Orders, Customers, Reviews, Media, Billboards
- Admin role set via Clerk: `user.publicMetadata.role = 'admin'`

## Deployment

- **Vercel**: Primary deployment platform
- Headers configured in `vercel.json` and `middleware.ts`
- ISR for product pages (revalidate 60s)
- Static asset caching (immutable)

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection, CSP headers, nonce generation |
| `app/layout.tsx` | Root layout, fonts, metadata, ClerkProvider |
| `app/providers.tsx` | Client-side providers (Query, Auth, Cart) |
| `contexts/AuthContext.tsx` | Clerk-backed auth wrapper (useAuth API) |
| `contexts/CartContext.tsx` | Cart state with Supabase sync |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (cookies) |
| `lib/cashfree.ts` | Cashfree SDK integration |
| `types/database.ts` | Auto-generated Supabase types |

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
