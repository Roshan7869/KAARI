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
├── email-templates/    # Email templates
└── ...
contexts/               # AuthContext, CartContext
hooks/                  # Custom React hooks
types/                  # Global TypeScript types
tests/                  # E2E tests
emails/                 # React Email JSX templates
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

## API Routes

| Path | Method | Purpose |
|------|--------|---------|
| `/api/checkout` | POST | Create order from cart |
| `/api/payments/*` | - | Cashfree payment handling |
| `/api/webhooks/*` | POST | Payment webhooks |
| `/api/admin/*` | - | Admin operations (requires admin role) |
| `/api/reviews` | GET/POST | Product reviews CRUD |

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
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://js.cashfree.com...`,
    // ... see middleware.ts for full config
  ].join('; ')
}
```

### Clerk + Supabase Integration

`createUserClient()` in `lib/supabase/auth-client.ts` uses Clerk's native Supabase integration (passes Clerk session token directly). No JWT template is required — Clerk automatically validates the session against Supabase RLS policies.

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

# Cloudinary (image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

# Resend (emails)
RESEND_API_KEY

# Upstash Redis (rate limiting)
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

Use utilities from `lib/sanitization.ts` and `lib/sanitize.ts`:
- `sanitizeTextInput()` - XSS prevention
- `sanitizeSearchQuery()` - SQL injection prevention
- `sanitizeUrl()` - URL validation (blocks javascript:/data:)

### Rate Limiting

- Client-side: `lib/client-rate-limit.ts`
- Server-side: `lib/server-rate-limit.ts` (Upstash Redis)

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

## Deployment

- **Vercel**: Primary deployment platform
- Headers configured in `vercel.json` and `middleware.ts`
- ISR for product pages (revalidate 60s)
- Static asset caching (immutable)

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

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

## Code Conventions

- **Components**: Functional with hooks, no class components
- **Exports**: Named exports preferred (default only for page.tsx per Next.js convention)
- **State**: TanStack Query for server state, Context for client-only global state (auth, cart), `useState` for local UI state
- **Error handling**: Toast via Sonner for user-facing errors, `HttpError` class for API errors, never swallow silently
- **CSS**: Tailwind with `cn()` utility (from `lib/utils`) for conditional classes
- **Forms**: Zod schemas in `lib/validations/`, `sanitizeTextInput()` on all free-text fields before DB
- **Imports**: Use `@/` path aliases, never relative paths across directories

## Boundaries

- **NEVER modify `middleware.ts` without verifying CSP impact** — every change affects security headers and route protection
- **NEVER modify `lib/supabase/server.ts` without checking both server and browser client paths** — 120+ files depend on it
- **NEVER commit `.env*` files** — secrets must stay local or in Vercel Env Variables
- **NEVER use `SUPABASE_SERVICE_ROLE_KEY` in client components** — import `server-only` guard is there for a reason
- **Always run `npm run type-check` before committing** — catch type errors early
- **Always run `npm run lint` before committing** — ESLint catches security and accessibility issues
- **Ask before modifying database schema** — RLS policies and migration files must stay in sync

## Architecture Hotspots (from knowledge graph)

- `lib/supabase/server.ts` — **120 dependents**, highest blast-radius file
- `lib/logger.ts` — 72 dependents, second-highest blast-radius
- All `route.ts` files share the same import pattern (server, logger, auth, validation) — consider a shared `createApiRoute()` factory
- `lib/firebase.ts` — **isolated singleton, likely dead code** — verify before using
- `cashfree-mcp/` is embedded in the main project (72 graph nodes across 18 communities) — should be extracted to its own package

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
