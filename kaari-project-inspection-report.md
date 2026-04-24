# KAARI MARKETPLACE — FULL PROJECT INSPECTION REPORT

**Date**: 2026-04-13  
**Auditor**: Senior Full-Stack QA Engineer  
**Branch**: backup-before-moving-nextjs  
**Method**: Static code analysis (code-review-graph + grep) + Live browser testing (blocked by 500 errors)

---

## ═════════════════════════════════════════════════════════
## PHASE 1 — STATIC CODE ANALYSIS (COMPLETED)
## ═════════════════════════════════════════════════════════

### 1.1 PROJECT STRUCTURE SCAN

**43 Pages** | **53 API Routes** | **110+ Components** | **63 Lib files** | **11 Hooks**

#### Pages (43)
```
app/page.tsx, app/about, app/cart, app/checkout, app/contact,
app/login, app/signup, app/payment, app/payment-failed,
app/order-confirmation/[orderId], app/orders, app/orders/[orderId]/track,
app/orders/[orderId]/return, app/products, app/products/[slug],
app/wishlist, app/account/settings, 5 legal pages, 13 admin pages
```

#### API Routes (53)
```
Auth (5):         login, logout, me, password-reset, signup
Cart (3):         cart, cart/items/[id], cart/merge
Checkout (1):     checkout
Payment (3):      payment-session, payment-session/complete, payment-session/verify
Payment (1):      payment/checkout-url
Cashfree (1):     payments/cashfree/create-order
Products (3):     products, products/[id], products/[id]/reviews
Orders (3):       orders, orders/[id]/cancel, orders/[id]/return
Webhooks (2):     clerk, payment
Admin (15):       audit, billboard, coupons, customers, export, inventory,
                  media, orders, products, reviews, settings, stats, stories
Health (1):       health
Contact (1):      contact
Search (1):       search/suggestions
Coupons (1):      coupons/validate
Cron (3):         send-emails, cleanup-orders, retry-webhooks
Pincode (1):      pincode/[pin]
Social (1):       social-order-intent
Wishlist (1):     wishlist
```

#### Lib Files (63) — Key Infrastructure
```
lib/cashfree.ts          — Server-side Cashfree integration (order creation, payment sessions)
lib/cashfree-server.ts   — Webhook signature verification (HMAC-SHA256)
lib/cashfree-sdk.ts      — Client-side Cashfree Drop/Checkout SDK
lib/server-rate-limit.ts — Upstash Redis rate limiting with failClosed support
lib/client-rate-limit.ts — Client-side rate limiting
lib/supabase/admin.ts    — Admin client (service role, bypasses RLS)
lib/supabase/auth-client.ts — Clerk-authenticated client (uses getToken(), RLS-enforced)
lib/supabase/client.ts   — Browser anon client
lib/supabase/server.ts   — Server anon client
lib/payment-secure.ts    — Secure payment session handling
lib/email.ts             — Resend email integration
lib/csrf.ts / csrf-server.ts — CSRF protection
lib/sanitization.ts      — Input sanitization (XSS, SQL injection)
lib/shipping.ts          — Shipping calculations
lib/logger.ts            — Structured logging
lib/config.ts            — App configuration
lib/validations/*.ts     — Zod schemas (checkout, auth, cart, product, review, social)
```

---

### 1.2 ENVIRONMENT VARIABLES AUDIT

**Environment variables used in code (unique):**

| Variable | Location | Required | In .env.example |
|----------|----------|----------|-----------------|
| NEXT_PUBLIC_APP_URL | layout, robots, config, metadata | ✅ | ✅ |
| NEXT_PUBLIC_SUPABASE_URL | client, server, admin, auth-client | ✅ | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | client, server, admin, auth-client | ✅ | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | admin, server, migrations | ✅ | ✅ |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | layout, middleware | ✅ | ✅ |
| CLERK_SECRET_KEY | webhook, auth routes | ✅ | ✅ |
| CLERK_WEBHOOK_SECRET | webhook/clerk | ✅ | ✅ |
| CASHFREE_APP_ID | cashfree, cashfree-server | ✅ | ✅ |
| CASHFREE_SECRET_KEY | cashfree, cashfree-server | ✅ | ✅ |
| CASHFREE_WEBHOOK_SECRET | cashfree-server | ✅ | ✅ |
| CASHFREE_TEST_MODE | cashfree, cashfree-server | ✅ | ✅ |
| NEXT_PUBLIC_CASHFREE_MODE | cashfree-sdk | ✅ | ✅ |
| UPSTASH_REDIS_REST_URL | server-rate-limit | ✅ | ✅ |
| UPSTASH_REDIS_REST_TOKEN | server-rate-limit | ✅ | ✅ |
| RESEND_API_KEY | resend-client, email | ✅ | ✅ |
| NOTIFICATIONS_FROM_EMAIL | email | ✅ | ✅ |
| NEXT_PUBLIC_WHATSAPP_NUMBER | layout, WhatsAppButton | ✅ | ✅ |
| NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME | cloudinary | ✅ | ✅ |
| NEXT_PUBLIC_CLOUDINARY_API_KEY | cloudinary | ✅ | ✅ |
| CLOUDINARY_API_KEY | cloudinary-server | ✅ | ✅ |
| CLOUDINARY_API_SECRET | cloudinary-server | ✅ | ✅ |
| NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET | cloudinary | ✅ | ✅ |
| CRON_SECRET | cron routes | ✅ | ✅ |
| NEXT_PUBLIC_SENTRY_DSN | sentry configs | ✅ | ✅ |
| SENTRY_AUTH_TOKEN | sentry configs | ✅ | ✅ |
| SENTRY_ORG | sentry configs | ✅ | ✅ |
| SENTRY_PROJECT | sentry configs | ✅ | ✅ |
| NEXT_PUBLIC_POSTHOG_KEY | PostHogProvider | ✅ | ✅ |
| NEXT_PUBLIC_POSTHOG_HOST | PostHogProvider | ✅ | ✅ |
| POSTHOG_KEY | PostHogProvider | ⚠️ | ✅ |
| KAARI_BASE_URL | email templates | ⚠️ | ✅ |
| NEXT_PUBLIC_BUSINESS_EMAIL | cloudinary | ⚠️ | ✅ |
| NEXT_PUBLIC_CLD_LOGO | config | ⚠️ | ✅ |
| NEXT_PUBLIC_CLD_HERO_TEXTURE | config | ⚠️ | ✅ |
| NEXT_PUBLIC_CLD_ARTISAN_STORY | config | ⚠️ | ✅ |

**❌ CRITICAL: `.env.local` exists but dev server returns 500 — likely missing required env vars (Clerk/Supabase keys). All pages return Internal Server Error.**

---

### 1.3 SUPABASE INTEGRATION AUDIT

**Key findings:**

| File | Pattern | Status |
|------|---------|--------|
| `lib/supabase/auth-client.ts` | ✅ Uses `auth()` + `getToken()` — NEW pattern (no JWT template needed) | PASS |
| `lib/supabase/admin.ts` | ✅ Service role client for admin/webhook routes | PASS |
| `lib/supabase/client.ts` | ✅ Browser anon client | PASS |
| `lib/supabase/server.ts` | ✅ Server anon client | PASS |
| `lib/supabase/middleware.ts` | ✅ Middleware Supabase client | PASS |

**✅ No deprecated JWT template pattern found.** The new `createUserClient()` uses Clerk's native Supabase integration with `getToken()`.

---

### 1.4 CLERK AUTH AUDIT (middleware.ts)

**Protected routes (require auth):**
```
/checkout, /checkout/(.*), /cart, /cart/(.*), /payment(.*), 
/order-confirmation(.*), /orders, /orders/(.*), /wishlist, /wishlist/(.*)
```

**Admin routes (require admin role):**
```
/admin, /admin/(.*)
```

**Auth pages (redirect logged-in users):**
```
/login, /signup
```

**✅ Webhook routes exempted from Clerk:**
```
/api/webhooks/* — gets CSP headers but no auth redirect
```

**⚠️ FINDING: `/api/admin/*` routes are protected by middleware, BUT individual API routes should also verify `sessionClaims.metadata.role === 'admin'` as defense-in-depth. Some may rely only on middleware.**

**✅ Open redirect protection:**
`isSafeRedirectPath()` blocks:
- Non-`/` paths (external URLs)
- `//` prefixed paths
- Protocol-like paths (`/javascript:`, `/data:`)
- Control characters and Unicode direction overrides

---

### 1.5 CASHFREE WEBHOOK AUDIT

**Webhook handler: `app/api/webhooks/payment/route.ts`**

| Check | Status |
|-------|--------|
| Reads CASHFREE_WEBHOOK_SECRET from env | ✅ |
| Verifies HMAC-SHA256 signature (timing-safe) | ✅ |
| Handles PAYMENT_SUCCESS_WEBHOOK | ✅ |
| Handles PAYMENT_FAILED_WEBHOOK | ✅ |
| Handles USER_DROPPED_WEBHOOK | ✅ |
| Handles ORDER_PAID_WEBHOOK | ✅ |
| Handles REFUND_STATUS_WEBHOOK | ✅ |
| Uses admin client for DB updates (correct — no user auth context) | ✅ |
| Returns 200 quickly (email in background) | ⚠️ Email is synchronous |
| Idempotency check via webhook_events table | ✅ |

---

### 1.6 RLS POLICY CHECK

**Migration files with RLS:**

| Migration | Tables with RLS | Status |
|-----------|-----------------|--------|
| `20260313..._b1b40322.sql` | orders, carts, cart_items | ✅ ENABLE ROW LEVEL SECURITY |
| `20260411300000_orders_rls.sql` | orders, checkout_sessions, cashfree_sessions, payment_sessions | ✅ |
| `20260413130000_enable_rls_and_policies.sql` | carts, cart_items, orders, reviews | ✅ With policies |

**RLS Policies verified:**
- ✅ `orders` — users can read own orders (`user_id = auth_profile_id()`)
- ✅ `carts` — users can CRUD own cart
- ✅ `cart_items` — scoped through parent cart
- ✅ `reviews` — anyone can read approved, users can insert/update own

**⚠️ NOTE: `auth_profile_id()` helper function resolves Clerk ID → Supabase UUID. This is critical for RLS to work correctly.**

---

### 1.7 REDIS USAGE AUDIT

**Rate limiting uses Upstash Redis:**

| File | Usage | Status |
|------|-------|--------|
| `lib/server-rate-limit.ts` | `@upstash/ratelimit` + `@upstash/redis` | ✅ Proper |
| `lib/client-rate-limit.ts` | Client-side rate limit (localStorage) | ✅ Fallback |
| `supabase/functions/rate-limit/index.ts` | Edge function rate limiting | ✅ |

**UPSTASH env vars properly used in server-rate-limit.ts with `.trim()` and URL validation.**

---

### 1.8 API ROUTES INVENTORY

| Route | Method | Auth | Rate Limited | Risk |
|-------|--------|------|--------------|------|
| `/api/admin/*` (15 routes) | Various | ✅ Admin role | ✅ Middleware | Low |
| `/api/auth/login` | POST | ✅ Clerk | ✅ failClosed | Low |
| `/api/auth/logout` | POST | ✅ Clerk | N/A | Low |
| `/api/auth/me` | GET | ✅ Clerk | ❌ None | Medium |
| `/api/auth/password-reset` | POST | ✅ Clerk | ✅ failClosed | Low |
| `/api/auth/signup` | POST | ✅ Clerk | ❌ None | Medium |
| `/api/cart` | GET/POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/cart/items/[id]` | PATCH/DELETE | ✅ Clerk | ✅ Middleware | Low |
| `/api/cart/merge` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/checkout` | POST | ✅ Clerk | ✅ failClosed | Low |
| `/api/contact` | POST | ❌ None | ❌ None | 🔴 Spam risk |
| `/api/coupons/validate` | POST | ❌ None | ❌ None | Low (read-only) |
| `/api/cron/*` (3 routes) | GET/POST | ✅ CRON_SECRET | N/A | Low |
| `/api/health` | GET | ❌ None | ❌ None | Low (read-only) |
| `/api/orders` | GET | ✅ Clerk | ✅ Middleware | Low |
| `/api/orders/[id]/cancel` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/orders/[id]/return` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/payment-session` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/payment-session/complete` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/payment-session/verify` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/payment/checkout-url` | GET | ❌ None | ❌ None | 🔴 Payment URL exposure |
| `/api/payments/cashfree/create-order` | POST | ✅ Clerk | ✅ Middleware | Low |
| `/api/pincode/[pin]` | GET | ❌ None | ❌ None | Low (read-only) |
| `/api/products` | GET | ❌ None | ❌ None | Low (public catalog) |
| `/api/products/[id]` | GET | ❌ None | ❌ None | Low |
| `/api/products/[id]/reviews` | GET/POST | ✅ POST | ❌ None | Medium |
| `/api/reviews` | GET | ❌ None | ❌ None | Low |
| `/api/reviews/[id]` | GET/PATCH/DELETE | ✅ Modify | ❌ None | Medium |
| `/api/search/suggestions` | GET | ❌ None | ❌ None | Low |
| `/api/social-order-intent` | POST | ❌ None | ❌ None | 🔴 Creates orders |
| `/api/webhooks/clerk` | POST | ✅ Clerk sig | N/A | Low |
| `/api/webhooks/payment` | POST | ✅ HMAC sig | ❌ Exempt | Low |
| `/api/wishlist` | GET/POST | ✅ Clerk | ✅ Middleware | Low |

---

## ═════════════════════════════════════════════════════════
## PHASE 2 — LIVE BROWSER TESTING (BLOCKED)
## ═════════════════════════════════════════════════════════

**❌ All routes return HTTP 500. Dev server cannot start properly.**

Likely cause: Missing required environment variables (Clerk keys, Supabase keys) in `.env.local`.

All browser tests (2.1-2.8) are **blocked** — cannot test:
- Homepage rendering
- Auth flows
- Protected route redirects
- Console errors
- Network audit
- Mobile viewport

**RECOMMENDATION**: Populate `.env.local` with real Clerk + Supabase credentials before re-running browser tests.

---

## ═════════════════════════════════════════════════════════
## PHASE 3 — INTEGRATION SMOKE TESTS (BLOCKED)
## ═════════════════════════════════════════════════════════

**❌ Cannot test login/logout flows — server returns 500.**

Requires working dev server with valid Clerk + Supabase credentials.

---

## ═════════════════════════════════════════════════════════
## PHASE 4 — FINAL REPORT
## ═════════════════════════════════════════════════════════

## 🔴 CRITICAL ISSUES (must fix before production)

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| C1 | `app/api/social-order-intent/route.ts` | — | Creates order intents without auth — anyone can spam | Add `auth()` check or require user ID |
| C2 | `app/api/payment/checkout-url/route.ts` | — | Returns payment session URLs without auth | Add Clerk auth requirement |
| C3 | `app/api/contact/route.ts` | — | No rate limiting — spam abuse vector | Add `applyRateLimit(request, 'api')` |
| C4 | Multiple admin API routes | Various | `error.message` returned to clients — leaks DB details | Replace with generic error messages + server-side logging |
| C5 | `app/admin/analytics/page.tsx` | 28,30,43,56,58,106 | 7 TypeScript errors — `never` type usage | Fix type definitions for analytics data queries |
| C6 | `components/pages/Cart.tsx` | 64 | Raw `<img>` tag (ESLint warning) | Replace with `<Image />` from next/image |
| C7 | `.env.local` | — | Dev server returns 500 on all routes | Verify all required env vars are populated |

## 🟡 WARNINGS (should fix soon)

| # | Check | File | Issue | Priority |
|---|-------|------|-------|----------|
| W1 | Phone regex mismatch | `lib/sanitization.ts` vs `checkout.schema.ts` | Client uses looser regex, server strict `/^[6-9]\d{9}$/` — 400 errors possible | High |
| W2 | Auth routes missing failClosed | `app/api/auth/me/`, `app/api/auth/signup/` | Only password-reset uses `failClosed: true` | Medium |
| W3 | Cashfree mode desync risk | `lib/cashfree.ts` + `lib/cashfree-sdk.ts` | No runtime validation that server and client modes match | Medium |
| W4 | Email in webhook is sync | `app/api/webhooks/payment/route.ts` | Email sending blocks webhook response — risk of timeout | Medium |
| W5 | ProductGrid deps warnings | `components/products/ProductGrid.tsx` | 3 React hooks missing dependencies in useCallback/useEffect | Medium |
| W6 | CSP nonce not consumed in layout | `app/layout.tsx` | `x-nonce` header set but not read by `<Script>` components | Low |
| W7 | Migration idempotency | `20260413130000_enable_rls_and_policies.sql` | CREATE POLICY without IF NOT EXISTS guards | Low |
| W8 | Contact form spam | `app/api/contact/route.ts` | No rate limiting on contact form submissions | Medium |

## 🟢 PASSING CHECKS

| Category | Status |
|----------|--------|
| Rate limiter failClosed on checkout ✅ | Cashfree safe defaults ✅ |
| RLS on order pages ✅ | CSP nonce-based per-request ✅ |
| Cashfree mode unified ✅ | OG image fix (id in select) ✅ |
| Page metadata (5 legal pages) ✅ | simulateProcessing gated ✅ |
| Quick polish (cron, robots, X-XSS, webhook-utils deleted) ✅ | Webhook signature verification ✅ |
| Admin routes still use admin client ✅ | Order track page has IDOR protection ✅ |
| Open redirect protection ✅ | Service role key not in client ✅ |
| CSRF cookie (httpOnly, secure, sameSite) ✅ | Cart total not manipulable ✅ |
| No secrets in git history ✅ | .env.example documents both Cashfree vars ✅ |
| No NEXT_PUBLIC_CASHFREE_TEST_MODE ✅ | No duplicate CSP ✅ |

## 📸 SCREENSHOTS TAKEN

| Label | Result |
|-------|--------|
| homepage-load | 500 Internal Server Error (env vars missing) |

## 📋 ENV VARS STATUS

| Variable | In .env.example | Used in Code | .env.local Status |
|----------|-----------------|--------------|-------------------|
| NEXT_PUBLIC_APP_URL | ✅ | ✅ | ⚠️ Present but server 500 |
| NEXT_PUBLIC_SUPABASE_URL | ✅ | ✅ | ⚠️ Needs real value |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | ✅ | ⚠️ Needs real value |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ✅ | ⚠️ Needs real value |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | ✅ | ✅ | ⚠️ Likely missing (causes 500) |
| CLERK_SECRET_KEY | ✅ | ✅ | ⚠️ Likely missing (causes 500) |
| CASHFREE_APP_ID | ✅ | ✅ | ⚠️ May be missing |
| CASHFREE_SECRET_KEY | ✅ | ✅ | ⚠️ May be missing |
| CASHFREE_WEBHOOK_SECRET | ✅ | ✅ | ⚠️ May be missing |
| UPSTASH_REDIS_REST_URL | ✅ | ✅ | ⚠️ Missing = rate limiting fail-open |
| UPSTASH_REDIS_REST_TOKEN | ✅ | ✅ | ⚠️ Missing = rate limiting fail-open |
| RESEND_API_KEY | ✅ | ✅ | ⚠️ May be missing |
| NEXT_PUBLIC_WHATSAPP_NUMBER | ✅ | ✅ | ⚠️ May have placeholder value |
| SENTRY_DSN | ✅ | ✅ | ⚠️ May be missing |
| POSTHOG_KEY | ✅ | ✅ | ⚠️ May be missing |

## 🗺️ API ROUTES INVENTORY

See Section 1.8 above for full inventory (53 routes).

**Unprotected routes requiring attention:**

| Route | Auth | Rate Limit | Risk Level | Recommendation |
|-------|------|------------|------------|----------------|
| `/api/contact` | ❌ | ❌ | 🔴 High | Add rate limiting + auth optional |
| `/api/social-order-intent` | ❌ | ❌ | 🔴 Critical | Add auth requirement |
| `/api/payment/checkout-url` | ❌ | ❌ | 🔴 High | Add auth requirement |
| `/api/auth/me` | ✅ | ❌ | 🟡 Medium | Add rate limiting |
| `/api/auth/signup` | ✅ | ❌ | 🟡 Medium | Add rate limiting |
| `/api/reviews` POST | ✅ | ❌ | 🟡 Medium | Add rate limiting |

## 🏆 PRODUCTION READINESS SCORE

| Category | Score | Notes |
|----------|-------|-------|
| Auth & Session Security | 8/10 | Clerk + middleware solid; auth routes missing failClosed |
| API Route Protection | 5/10 | 3 routes unprotected (social-order-intent, checkout-url, contact) |
| Supabase RLS & Integration | 9/10 | RLS enabled, auth-client uses new pattern, admin still works |
| Error Handling | 5/10 | Admin routes leak error.message; webhook email is sync |
| Mobile Responsiveness | N/A | Cannot test (server 500) |
| Environment Config | 4/10 | Server won't start — likely missing Clerk/Supabase keys |
| TypeScript Correctness | 5/10 | 7 errors in analytics page; 4 ESLint warnings |
| Payment Security | 8/10 | Cashfree safe defaults, HMAC verification, amount computed server-side |
| **Overall** | **44/70** | |

## Final Verdict: ❌ NOT READY FOR PRODUCTION

**Blocking issues:**
1. Dev server returns 500 — missing required environment variables
2. `/api/social-order-intent` has no auth — anyone can create orders
3. `/api/payment/checkout-url` has no auth — payment URLs exposed
4. `/api/contact` has no rate limiting — spam abuse vector
5. Admin API routes leak `error.message` — database internals exposed
6. 7 TypeScript errors prevent clean build
7. Phone validation regex mismatch between client and server

**To reach production readiness:**
1. Populate `.env.local` with real Clerk + Supabase credentials
2. Add auth to `/api/social-order-intent` and `/api/payment/checkout-url`
3. Add rate limiting to `/api/contact` and auth routes
4. Sanitize admin API error responses
5. Fix TypeScript errors in `app/admin/analytics/page.tsx`
6. Unify phone regex between client and server
7. Replace `<img>` with `<Image />` in Cart.tsx
8. Re-run browser tests with working dev server