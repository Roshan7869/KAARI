# Kaari Fixes — 2026-04-12

## CRITICAL Fixes (Block 1)

### FIX-S1: Real CSRF Protection
- **Created** `lib/csrf-server.ts` — server-side CSRF using HTTP-only SameSite=Strict cookies
- **Modified** `components/pages/Checkout.tsx` — reads CSRF token from cookie, sends via `x-csrf-token` header
- **Modified** `app/api/checkout/route.ts` — validates CSRF token server-side before processing
- **Modified** `middleware.ts` — generates CSRF cookie for checkout routes
- **Marked** `lib/csrf.ts` as `@deprecated` pointing to `lib/csrf-server.ts`

### FIX-S2 + API3: Secure /api/health endpoint
- **Modified** `app/api/health/route.ts` — non-admins see only `{ status, timestamp }`; admins see full integration details
- Uses `requireAdmin()` to gate detailed info

### FIX-API1: Protect POST /api/products with requireAdmin
- **Modified** `app/api/products/route.ts` — POST handler now requires admin role via `requireAdmin()`

### FIX-API2: Rate limit /api/social-order-intent
- **Modified** `app/api/social-order-intent/route.ts` — added `applyRateLimit(request, 'auth', false)`

## HIGH Fixes (Block 2)

### FIX-PF2: Remove static product data fallback
- **Modified** `components/products/ProductGrid.tsx` — removed `data/products` import, removed `useDatabase` state check, always uses Supabase query, shows "No products found" when empty

### FIX-P5: RelatedProducts DB-backed (completed in prior session)
- **Rewrote** `components/products/RelatedProducts.tsx` — React Query from Supabase, `currentProductId` + `category` props
- **Modified** `components/pages/ProductDetail.tsx` — passes `currentProductId` and `category` to RelatedProducts

### FIX-C5: Server-side coupon validation
- **Modified** `app/api/checkout/route.ts` — added coupon validation block that checks coupon code against DB (active, not expired, not fully used, minimum order amount), calculates discount server-side, never trusts client-provided discount amounts

### FIX-C2: Variant price validation
- **Modified** `app/api/checkout/route.ts` — cart item query now selects `variant_id`, price validation checks `product_variants.price` when variant exists, falls back to `products.base_price`

### FIX-PY1: Webhook AND→OR logic
- **Modified** `app/api/webhooks/payment/route.ts` — changed `if (cashfreeSessionId && cfPaymentId)` to `if (cashfreeSessionId || cfPaymentId)` so webhooks with only one ID are still processed; changed column name `cashfree_session_id` → `order_id` to match actual DB schema

### FIX-PY2: Cart deletion uses cart_id not user_id
- **Modified** `app/api/webhooks/payment/route.ts` — removed fallback `delete where user_id`, now logs warning when `order.cart_id` is missing instead of deleting ALL user cart items

### FIX-S6+S7: CSP hardening
- **Modified** `middleware.ts` — added `'nonce-${nonce}'` to `style-src`, added security comments explaining why `unsafe-eval` (Clerk SDK) and `unsafe-inline` (Tailwind/Framer Motion) are retained

## MEDIUM Fixes (Block 3)

### FIX-I1: Remove duplicate/dead files
- `lib/webhook-utils.ts` was already deleted (shown in git status)
- No imports of `@/lib/sanitize` found (the `email-templates/sanitize.ts` is internal)
- ProductGrid no longer imports runtime data from `@/data/products`

## TypeScript Fixes (Block 5)

### All 5 build-blocking TS errors fixed:
1. `checkout/route.ts:265` — `discount_amount: couponDiscount || null` → `couponDiscount || 0`
2. `health/route.ts:49` — `requireAdmin(request)` → `requireAdmin()` (zero-arg signature)
3. `products/route.ts:116` — same `requireAdmin()` fix
4. `webhooks/payment/route.ts:385` — `cashfree_session_id` column → `order_id`; `as any` cast for flexible insert; `cfPaymentId || undefined` → `cfPaymentId || null`
5. `RelatedProducts.tsx` — `category: string` → `category?: string | null`; null guard in queryFn
6. `ProductDetail.tsx:788` — `category={product.category}` → `category={product.category ?? ''}`
7. `Checkout.tsx:857` — removed orphaned `}` from CSRF validation refactor

## Verification Results

```
npx tsc --noEmit   → 0 errors
npx next lint       → 0 warnings, 0 errors
```