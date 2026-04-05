# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaari Marketplace** - A handmade crochet products e-commerce platform built with Vite + React + TypeScript + Supabase. Features include product browsing, cart management, checkout flow, product customization, and admin dashboard. Currency: **INR (Indian Rupees)**.

## Common Commands

```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
npm run test         # Run Vitest tests (all files)
npm run test:watch   # Run tests in watch mode
npx vitest run src/test/example.test.ts  # Run single test file
npx vitest run src/test/security.audit.test.ts  # Run security tests
npx playwright test  # Run Playwright E2E tests
npm run audit        # Run project audit script
npm run db-check     # Run database check script
npm run audit:all    # Run all audit/check scripts
```

## Tech Stack

- **Frontend**: Vite 5, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn-ui (Radix primitives), Framer Motion
- **Backend**: Supabase (Auth, Database, Storage)
- **State**: React Context (AuthContext, CartContext) + React Query
- **Routing**: React Router DOM with lazy loading + Suspense
- **3D**: React Three Fiber + Drei (YarnBall3D component)

## Code Architecture

### Provider Hierarchy

```
QueryClientProvider
  └── AuthProvider       # Initializes user session, loads on mount
        └── CartProvider     # Requires user ID from auth
              └── TooltipProvider
                    └── BrowserRouter → Routes
```

**Critical**: Auth must initialize before Cart because cart operations require `user.id`.

### Route Loading Pattern

All page components use lazy loading with Suspense:
```tsx
const Index = lazy(() => import("./pages/Index.tsx"));
// PageLoader component shows spinner during load
```

### Database Tables & Relationships

```
profiles ← user_roles (admin access via has_role() function)
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
```

**Key Table Fields**:
- `cart_items.item_type`: 'standard' | 'customized'
- `cart_item_customizations.quote_status`: 'not_needed' | 'pending' | 'approved' | 'rejected'
- `orders.status`: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
- `product_variants.stock_qty`: Available inventory (checked before cart operations)

**Key RPC Functions**:
- `create_order_from_cart(p_cart_id, p_payment_method, ...)` - Atomic order creation from cart
- `has_role(_role, _user_id)` - Check user role (admin/customer)

### Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | Index | Public | Home page with hero, features |
| `/products` | Products | Public | Product listing |
| `/products/:slug` | ProductDetail | Public | Product detail page |
| `/cart` | Cart | Public | Shopping cart |
| `/checkout` | Checkout | Required | Checkout flow |
| `/dummy-payment` | DummyPayment | Required | Payment simulation |
| `/order-confirmation/:orderId` | OrderConfirmation | Required | Order confirmation |
| `/admin` | Admin | Admin role | Admin dashboard |
| `/login` | Login | Public | User login |
| `/signup` | Signup | Public | User registration |

### Product Customization Flow

Products with `allow_customization: true` support:
1. Customer provides customization details (message, size, color, material)
2. Optional file uploads via `customization_uploads` table
3. Budget range and delivery deadline
4. `quote_status` tracks approval workflow (not_needed | pending | approved | rejected)

### Stock Validation

Cart operations validate stock via `product_variants.stock_qty`:
- `resolveVariantForStock()` fetches variant (uses default if none specified)
- Quantity checks happen in `addToCart()` and `updateQuantity()`
- Error thrown if quantity exceeds available stock

### Payment Flow

1. Checkout collects shipping/payment info
2. Calls `create_order_from_cart` RPC (creates order, order_items, clears cart atomically)
3. For non-COD: redirects to `/dummy-payment` with session
4. DummyPayment processes and redirects to `/order-confirmation/:orderId`
5. Webhook updates payment status via `processPaymentWebhook()`

## Import Patterns

```typescript
// Components
import { Button } from '@/components/ui/button';

// Contexts
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

// Supabase
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Types for table rows
type Product = Tables<'products'>;
type CartItem = Tables<'cart_items'>;

// Analytics
import { trackEvent } from '@/lib/analytics';
```

## Testing

- **Vitest**: Unit tests in `src/test/`. Test setup mocks `matchMedia` for responsive hooks.
- **Playwright**: E2E tests. Config uses `lovable-agent-playwright-config`.
- **Running tests**: `npm run test` for all, `npx vitest run <file>` for single file

## React Query Patterns

Custom hooks in `src/hooks/` use React Query for data fetching:

```typescript
// Query with caching
const { data, isLoading } = useAdminProducts({ search, category, page });

// Mutation with cache invalidation
const mutation = useCreateProduct();
mutation.mutate(productData); // Auto-invalidates ['admin-products'] on success

// Manual cache invalidation
queryClient.invalidateQueries({ queryKey: ['admin-products'] });
```

**Stale times**: Products use 30s stale time, single product uses 1min.

## Protected Routes

```typescript
// Auth-required routes wrapped in ProtectedRoute
<Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />

// Admin routes use nested AdminLayout (checks has_role('admin'))
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboard />} />
  <Route path="products" element={<AdminProducts />} />
</Route>
```

## Error Handling

```typescript
// Component-level error boundaries
<ErrorBoundary componentName="Cart">
  <CartComponent />
</ErrorBoundary>
```

## Security Notes

### Webhook Signature Validation (CRITICAL)

The webhook validation in `supabase/functions/payment-webhook/index.ts` implements:
- HMAC-SHA256 signature validation for payment callbacks
- Constant-time comparison (timing attack prevention)
- Session ownership verification

### Server-Side Payment Processing

API secrets are handled only in Supabase Edge Functions:
- `supabase/functions/cashfree-payment/index.ts` - Cashfree API calls
- Client-side code never handles API secrets
- Amount verification against database prevents tampering

### Input Sanitization

Use utilities from `src/lib/sanitization.ts` for all user input:
- `sanitizeTextInput()` - XSS prevention for text fields
- `sanitizeSearchQuery()` - SQL injection prevention for search
- `sanitizeUrl()` - URL validation (blocks javascript:/data: URIs)
- `validateEmail()`, `validatePhone()` - Format validation

### Rate Limiting

Client-side rate limiting in `src/lib/rateLimit.ts`:
- Login/signup attempts limited
- Checkout/payment operations throttled
- Exponential backoff for repeated failures

### Security Tables (Database)

- `admin_audit_log` - Immutable audit trail for admin actions
- `security_events` - Security event tracking
- `rate_limit_entries` - Server-side rate limiting storage

### Supabase Client Auth

Client configured with:
- `localStorage` for session persistence
- Auto token refresh enabled
- Uses `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)

### Security Headers

Configured in `public/_headers` (Netlify) and `vercel.json` (Vercel):
- CSP with allowed domains for Supabase and Cashfree
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Falls back to VITE_SUPABASE_ANON_KEY if set
VITE_SUPABASE_PROJECT_ID
```

## Custom Types in Hooks

The `useAdminProducts.ts` hook defines extended types for Supabase responses:

```typescript
// Admin product list with aggregated counts
interface ProductWithCounts extends Product {
  variant_count: number;
  media_count: number;
}

// Single product with relations
interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  media: ProductMedia[];
}
```

## Admin Access

Grant admin role:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'admin');
```

## Storage Buckets

- `product-media` (Public) - Product images
- `customization-uploads` (Private) - Customer customization files
- `avatars-private` (Private) - User avatars

## Database Migrations

Migrations in `supabase/migrations/`:
- `20260313*.sql` - Initial schema (products, carts, orders, profiles)
- `20260314*.sql` - Checkout/order policies, inventory triggers
- `20260321*.sql` - Notifications, payments tables
- `20260322*.sql` - Security tables (audit_log, security_events, rate_limit_entries), performance indexes

## Deployment

- **Netlify**: Security headers configured in `public/_headers`
- **Vercel**: Security headers configured in `vercel.json`
- Ensure environment variables are set in hosting platform:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
  - `CASHFREE_APP_ID` (Edge Function env)
  - `CASHFREE_SECRET_KEY` (Edge Function env)

## Analytics

Google Tag Manager integration via `trackEvent()`:
```typescript
trackEvent('add_to_cart', { item_id, item_name, price, quantity, currency: 'INR' });
```
Events push to `window.dataLayer` and call `gtag()` if available.

## Key Files to Understand

- `src/App.tsx` - Provider nesting, lazy-loaded routes
- `src/contexts/CartContext.tsx` - Cart logic with Supabase sync, stock validation
- `src/contexts/AuthContext.tsx` - Auth state management with Supabase auth
- `src/hooks/useAdminProducts.ts` - React Query hooks for admin CRUD operations
- `src/components/ProtectedRoute.tsx` - Auth guard for protected routes
- `src/components/ErrorBoundary.tsx` - Component-level error recovery
- `src/integrations/supabase/types.ts` - Auto-generated database schema types
- `src/integrations/supabase/client.ts` - Supabase client with localStorage session persistence
- `src/lib/payment.ts` - Payment session management (secure IDs, ownership verification)
- `src/lib/cashfree.ts` - Cashfree payment gateway integration (client-side helpers)
- `src/lib/webhook.ts` - Webhook signature validation utilities
- `src/lib/analytics.ts` - GTM event tracking utility
- `src/lib/sanitization.ts` - Input sanitization (XSS, SQL injection prevention)
- `src/lib/rateLimit.ts` - Client-side rate limiting
- `src/lib/auditLog.ts` - Admin action audit logging
- `src/lib/redirect.ts` - Safe URL redirect validation
- `src/lib/logger.ts` - Production-safe logging with sensitive data redaction
- `supabase/functions/payment-webhook/index.ts` - Webhook handler with HMAC validation
- `supabase/functions/cashfree-payment/index.ts` - Server-side Cashfree API calls