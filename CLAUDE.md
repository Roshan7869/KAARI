# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaari Marketplace** — A handmade crochet products e-commerce platform built with Next.js 15 App Router, React 19, TypeScript 5.8+, Clerk authentication, and Supabase database. Features include product browsing, cart management, checkout flow, product customization, reviews, and admin dashboard. Currency: **INR (Indian Rupees)**.

## Common Commands

```bash
npm run dev             # Start development server (port 3000)
npm run build           # Production build
npm run lint            # Run ESLint
npm run type-check      # TypeScript check (tsc --noEmit)
npm run test            # Run all Vitest tests
npx vitest run <pattern> # Run a single test file
npm run test:watch      # Run tests in watch mode
npm run e2e             # Run Playwright E2E tests
npm run e2e:ui          # Run E2E tests with UI
npm run format          # Format with Prettier
npm run format:check    # Check formatting without writing
npm run analyze         # Bundle analysis (ANALYZE=true next build)
npm run email:preview   # React Email preview server on port 3001
npm run seed:catalog    # Upload catalog via scripts/upload-catalog.js
npm run seed:catalog:dry # Dry-run catalog upload
```

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5.8+
- **Auth**: Clerk (`@clerk/nextjs`) with `publicMetadata.role === 'admin'` for admin access
- **Database**: Supabase (PostgreSQL + RLS policies)
- **Storage**: Supabase Storage + Cloudinary (product images)
- **Payments**: Cashfree (UPI, cards, net banking)
- **Email**: Resend + React Email (`@react-email/components`)
- **Rate Limiting**: Upstash Redis
- **UI**: Tailwind CSS 3.4, shadcn/ui (Radix primitives), Framer Motion
- **State**: TanStack Query for server state, React Context for client global state (auth, cart)
- **Analytics**: Sentry, PostHog, Vercel Analytics + Speed Insights
- **Query State**: nuqs (URL state management)
- **Fonts**: Playfair Display, Cormorant Garamond, Inter, DM Sans, Noto Serif Devanagari (Google Fonts)

## Architecture

### Directory Structure

```
app/
├── layout.tsx          # Root layout (ClerkProvider, fonts, metadata, CSP nonce)
├── providers.tsx       # QueryClient, AuthProvider, CartProvider, TooltipProvider
├── page.tsx            # Home page
├── (routes)/           # Route groups
├── admin/              # Admin dashboard (role-protected)
├── api/                # API routes (checkout, payments, webhooks, admin, etc.)
├── checkout/           # Checkout flow (protected)
├── products/[slug]/    # Dynamic product pages
├── cart/               # Cart page (protected)
├── orders/             # Order history (protected)
├── wishlist/           # Wishlist (protected)
├── login/              # Clerk login redirect
├── signup/             # Clerk signup redirect
└── ...
components/
├── ui/                 # shadcn/ui base components
├── admin/              # Admin-specific components
├── checkout/           # Checkout-specific components
├── products/           # Product-specific components
└── ...
lib/
├── supabase/           # Client + server Supabase clients
├── validation/         # Zod schemas
├── errors/             # HttpError class + withErrorHandler wrapper for API routes
├── email-templates/    # Email templates
└── ...
contexts/               # AuthContext, CartContext
hooks/                  # Custom React hooks
mocks/                  # MSW test handlers (setup.ts, server.ts, handlers.ts)
types/                  # Global TypeScript types
tests/                  # E2E tests (Playwright)
providers/              # PostHogProvider (separate from app/providers.tsx)
emails/                 # React Email JSX templates
cashfree-mcp/           # Embedded Cashfree MCP server (not yet extracted)
instrumentation.ts      # Sentry + OpenTelemetry (Next.js instrumentation hook)
instrumentation-client.ts # Client-side Sentry instrumentation
```

### Provider Hierarchy (Critical)

```
ClerkProvider (root layout)
  └── SentryUserSync
  └── Suspense
    └── PostHogProvider
      └── NuqsAdapter
        └── ErrorBoundary
          └── Providers
            └── QueryClientProvider
                  └── AuthProvider (Clerk-backed, maintains useAuth() API)
                        └── CartProvider (requires user ID from auth)
                              └── TooltipProvider
                                    └── Toaster/Sonner
```

Auth must initialize before Cart because cart operations require `user.id`. `profileReady` in AuthContext includes a 500ms delay after Clerk loads for authenticated users, giving the Clerk webhook time to create the Supabase profile before CartContext fetches the cart.

### Supabase Client Patterns

There are four distinct Supabase clients; picking the wrong one causes auth or RLS failures:

- **Client components**: `import { supabase } from '@/lib/supabase/client'` (browser client via `@supabase/ssr`)
- **Server components / API routes (cookie auth)**: `import { createClient } from '@/lib/supabase/server'` then `const supabase = await createClient()` — uses cookies, works for most server-side DB reads
- **API routes (user-specific authenticated access)**: `import { createUserClient } from '@/lib/supabase/auth-client'` then `const supabase = await createUserClient()` — passes Clerk's session token to Supabase for RLS policies via `auth.jwt()`. Returns `null` if user is not authenticated.
- **Admin/service role (server-only)**: `import { createAdminClient } from '@/lib/supabase/admin'` — bypasses RLS, requires `SUPABASE_SERVICE_ROLE_KEY`. Guarded by `import 'server-only'`.

### Authentication Checks

```typescript
// Client component
const isAdmin = (clerkUser?.publicMetadata?.role as string) === 'admin';

// Server component / API
import { auth } from '@clerk/nextjs/server';
const { sessionClaims } = await auth();
const isAdmin = sessionClaims?.metadata?.role === 'admin';
```

### Route Protection (`middleware.ts`)

- Protected routes: `/cart`, `/payment`, `/order-confirmation`, `/orders`, `/wishlist`
- Admin routes: `/admin/*` (requires `publicMetadata.role === 'admin'`)
- Auth pages redirect logged-in users to home
- CSP headers built per-request with unique nonce
- Admin API routes (`/api/admin/*`) enforce admin role at middleware level (returns 403 for non-admins)

### Cart & Guest Cart

- Authenticated carts are stored in Supabase (`carts` → `cart_items` → `cart_item_customizations`)
- Guest carts use `localStorage`; on first login detection, `CartProvider` merges guest items to the server via `mergeGuestCartToServer()` and then refetches
- `cart_items.item_type`: `'standard' | 'customized'`
- `cart_item_customizations.quote_status`: `'not_needed' | 'pending' | 'approved' | 'rejected'`

### Database Key Fields

- `orders.status`: `'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'`
- `reviews.status`: `'pending' | 'approved' | 'rejected'`

## Payment Flow

1. Checkout collects shipping/payment info
2. `POST /api/checkout` creates order via RPC `create_order_from_cart`
3. Cashfree payment session created server-side
4. Webhook at `/api/webhooks/cashfree` updates payment status
5. Order confirmation at `/order-confirmation/[orderId]`

## Admin Dashboard

- Route: `/admin/*` (protected by role check in middleware)
- Features: Products, Orders, Customers, Reviews, Media, Billboards, Coupons, Analytics, Audit Logs, Inventory
- Admin role set via Clerk: `user.publicMetadata.role = 'admin'`

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
import { createUserClient } from '@/lib/supabase/auth-client';
import { createAdminClient } from '@/lib/supabase/admin';

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

### Test Directory Layout
```
tests/
├── setup.ts                    # Server-only mock + console silencing
├── utils/
│   └── mock-request.ts         # createMockRequest(), createMockSupabaseClient(), parseResponse()
├── api/                        # Route handler tests (import GET/POST from route files)
├── lib/                        # Pure unit tests for utilities
└── e2e/                        # Playwright E2E specs (separate config)
mocks/
├── setup.ts                    # MSW lifecycle (beforeAll/afterEach/afterAll)
├── server.ts                   # MSW node server instance
└── handlers.ts                 # HTTP mock handlers for 6 endpoints
```

### Test Patterns
- **Unit tests**: `describe('functionName')` wrapping `it('case description')` blocks. Pure assertions, no mocking.
- **API route tests**: `vi.mock()` at module top for all external deps (Clerk, Supabase, logger, rate limiter). `beforeEach(() => vi.clearAllMocks())`. Import route handlers directly (`import { GET } from '@/app/api/.../route'`) and call with a `Request` object. Assert on both status code and response shape.
- **E2E tests**: Standard Playwright `test.describe` / `test` blocks using `page` fixture. Multiple selector fallbacks per locator.

### Key Test Utilities
- `createMockRequest({ method, url, body, headers })` — builds a `Request` with cookie mocks
- `createMockSupabaseClient(returnData, error)` — fully chainable mock (`.from().select().eq().single()`)
- MSW handlers mock 6 endpoints (`/api/products`, `/api/cart`, `/api/checkout`, etc.)
- The `server-only` module is auto-mocked in `tests/setup.ts` so server-side modules can be imported

### Vitest Config
- Pattern: `tests/**/*.test.{ts,tsx}` and `tests/**/*.spec.{ts,tsx}` (e2e excluded)
- Environment: jsdom with `@/` path alias
- Coverage thresholds: 80% lines, 75% branches

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
Content-Security-Policy built per-request with unique nonce. See `middleware.ts` for full config.

### Clerk + Supabase Integration
`createUserClient()` in `lib/supabase/auth-client.ts` uses Clerk's native Supabase integration (passes Clerk session token directly). No JWT template is required.

### Environment Variables
Required in `.env.local`:
```
# App
NEXT_PUBLIC_APP_URL
# Clerk (auto-injected by Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (server-side only)
# Cashfree (server-side only)
CASHFREE_APP_ID
CASHFREE_SECRET_KEY
CASHFREE_WEBHOOK_SECRET
# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
# Resend
RESEND_API_KEY
# Upstash Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
# PostHog
POSTHOG_KEY
# Sentry (optional)
SENTRY_AUTH_TOKEN
SENTRY_DSN
# Misc
NEXT_PUBLIC_WHATSAPP_NUMBER
```

### Input Sanitization
Use utilities from `lib/sanitization.ts`:
- `sanitizeTextInput()` - XSS prevention
- `sanitizeSearchQuery()` - SQL injection prevention
- `sanitizeUrl()` - URL validation (blocks javascript:/data:)

### Rate Limiting
- Client-side: `lib/client-rate-limit.ts`
- Server-side: `lib/server-rate-limit.ts` (Upstash Redis)

## Code Conventions

- **Components**: Functional with hooks, no class components
- **Exports**: Named exports preferred (default only for page.tsx per Next.js convention)
- **State**: TanStack Query for server state, Context for client-only global state (auth, cart), `useState` for local UI state
- **Error handling**: Toast via Sonner for user-facing errors, `HttpError` class for API errors, never swallow silently
- **CSS**: Tailwind with `cn()` utility (from `lib/utils`) for conditional classes
- **Forms**: Zod schemas in `lib/validations/`, `sanitizeTextInput()` on all free-text fields before DB
- **Imports**: Use `@/` path aliases, never relative paths across directories

## Boundaries

- **NEVER** modify `middleware.ts` without verifying CSP impact — every change affects security headers and route protection
- **NEVER** modify `lib/supabase/server.ts` without checking both server and browser client paths — 120+ files depend on it
- **NEVER** commit `.env*` files
- **NEVER** use `SUPABASE_SERVICE_ROLE_KEY` in client components
- **Always** run `npm run type-check` before committing
- **Always** run `npm run lint` before committing
- **Ask before modifying database schema** — RLS policies and migration files must stay in sync

## Architecture Hotspots (high blast-radius files)

- `lib/supabase/server.ts` — 120 dependents, highest blast-radius
- `lib/logger.ts` — 72 dependents
- `lib/firebase.ts` — isolated singleton, likely dead code
- `cashfree-mcp/` — embedded in main project, should be extracted to own package

## Error Handling Conventions

### Response Envelope
```typescript
// Success: { "success": true, "data": { ... } }
// Error:   { "success": false, "error": "message", "details": { ... } }
```

### HttpError + Error Handler (recommended pattern)
```typescript
import { HttpError, badRequest, notFound } from '@/lib/errors/http-error';
import { withErrorHandler } from '@/lib/errors/handler';

// Wrap route handlers for consistent error formatting
export const GET = withErrorHandler(async () => {
  const product = await findProduct(id);
  if (!product) throw notFound('Product not found');
  if (!product.inStock) throw badRequest('Out of stock', { productId: id });
  return NextResponse.json({ success: true, data: product });
});
// withErrorHandler catches HttpError, ZodError, and unknown errors,
// logs them via the shared logger, and returns the standard envelope.
```

### HTTP Status Codes
400 Validation, 401 Auth, 403 Forbidden, 404 Not found, 409 Conflict, 410 Expired, 429 Rate limit, 500 Internal

### Logger Levels
- `logger.error` — Unexpected errors, HTTP errors, critical failures
- `logger.warn` — Validation failures, security alerts, recoverable anomalies
- `logger.info` — Successful operations (order created, cart modified)
- `logger.debug` — Trace-level diagnostics

## Database Migrations

- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDHHMMSS_description.sql`
- **CRITICAL**: Never edit existing migrations; always add a new one. RLS policies and migration files must stay in sync.

## Deployment

- **Vercel** (Primary): Config in `vercel.json`, ISR for product pages (revalidate 60s), static asset caching (immutable 1yr)
- **Docker** (Alternative): `Dockerfile` and `docker-compose.yml` at project root
- **CI/CD**: GitHub Actions in `.github/workflows/ci.yml`, triggers on push to `main`, `develop`, `backup-before-moving-nextjs`
- **next.config.js** key settings: `output: 'standalone'` (for Docker), Sentry bundling via `withSentryConfig()`, image remote patterns for Supabase + Cloudinary + Unsplash, HSTS + security headers, `optimizePackageImports` for Radix/lucide/framer-motion

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection, CSP headers, nonce generation, CSRF tokens |
| `app/layout.tsx` | Root layout, fonts, metadata, ClerkProvider, structured data |
| `app/providers.tsx` | Client-side providers (Query, Auth, Cart, Tooltip, Toaster) |
| `contexts/AuthContext.tsx` | Clerk-backed auth wrapper (useAuth API) |
| `contexts/CartContext.tsx` | Cart state with Supabase sync + guest cart merge |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (cookies) |
| `lib/supabase/auth-client.ts` | Clerk-authenticated Supabase client for user-specific API routes |
| `lib/supabase/admin.ts` | Service-role client — RLS bypass, high privilege |
| `lib/cashfree.ts` | Cashfree SDK integration |
| `lib/errors/http-error.ts` | HttpError class + factory functions (badRequest, notFound, etc.) |
| `lib/errors/handler.ts` | withErrorHandler wrapper for API route error formatting |
| `types/database.ts` | Auto-generated Supabase types |
| `instrumentation.ts` | Sentry + OpenTelemetry instrumentation (Next.js hook) |
| `instrumentation-client.ts` | Client-side Sentry instrumentation |
| `next.config.js` | Standalone output (Docker), image remote patterns, redirects, HSTS + security headers, Sentry bundle |

## Resource Discovery

When you need skills, agents, commands, or any Claude Code resources:
```bash
# Knowledge Graph — 302 indexed resources across all repos
python3 ~/wiki/vault/.db/query_db.py stats                          # All counts
python3 ~/wiki/vault/.db/query_db.py skills "<search>"              # Skills by name/desc
python3 ~/wiki/vault/.db/query_db.py agents "<search>"              # Agents
python3 ~/wiki/vault/.db/query_db.py commands "<search>"            # Commands
python3 ~/wiki/vault/.db/query_db.py byrepo <repo-name>             # All resources in a repo
```

Wiki vault at `~/wiki/vault/topics/` has 59 topic files with full documentation.
