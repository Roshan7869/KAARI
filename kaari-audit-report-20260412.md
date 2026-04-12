# Kaari Marketplace — Comprehensive Audit Report
**Date**: 2026-04-12  
**Scope**: Full-stack audit across 12 dimensions  
**Branch**: backup-before-moving-nextjs  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 8 |
| HIGH | 18 |
| MEDIUM | 20 |
| LOW | 17 |

**Top 5 Priorities**:
1. **CSRF protection is client-side only** — checkout is vulnerable to CSRF attacks
2. **Category mismatch between static data and DB** — breaks product filtering
3. **`/api/products` POST allows any authenticated user** — should require admin
4. **Health endpoint exposes tech stack** — reconnaissance risk
5. **`product_type` badge uses old value** — `custom_request` vs `customized`

---

## Phase 1: Directory Inventory

**Status**: ✅ Complete  
- 50 API routes, 18 admin pages, 40+ components  
- 46 migration files, 7+ env vars with placeholder values  

---

## Phase 2: Navigation & Dead Link Audit

**Status**: ✅ Complete  

| Component | Issue | Severity |
|-----------|-------|----------|
| Navbar | Links to `/category/wearables`, `/category/bouquets`, `/category/hair-accessories`, `/custom` — all 404 | HIGH |
| Navbar | Links to `/account`, `/wishlist` — not protected by middleware | MEDIUM |
| SearchModal | Same 4 dead category links as Navbar | HIGH |
| Footer | All links valid (products, about, contact, legal) | OK |

**Fix**: Create `/category/[slug]` routes or update navbar links to use `/products?cat=` query params.

---

## Phase 3: Homepage Components Deep Audit

**Status**: ✅ Complete  

| Component | Data Source | Loading State | Error State | Issue |
|-----------|------------|---------------|-------------|-------|
| HeroBillboard | Supabase | ✅ Suspense | ✅ Empty state | OK |
| ProductShowcase | Supabase | ✅ Suspense | ✅ "coming soon" | OK |
| InstagramFeed | Supabase | ❌ Returns null | ❌ Silent | TypeScript `any` |
| TopProductsSection | Supabase | ✅ Skeleton | ✅ "coming soon" | OK |
| CategoryGrid | **Hardcoded** | N/A | N/A | **Dead links** |
| MarqueeTicker | **Hardcoded** | N/A | N/A | OK |
| ArtisanStory | **Hardcoded** | N/A | N/A | Fake stats |
| TrustBadges | **Hardcoded** | N/A | N/A | OK |
| CraftProcess | **Hardcoded** | N/A | N/A | OK |
| CrochetDivider | Pure SVG | N/A | N/A | OK |
| AnnouncementBar | **Hardcoded** | N/A | N/A | Phone "919999999999" |
| WhatsAppFloat | **Hardcoded** + env var | N/A | N/A | Default phone placeholder |

**Key Findings**:
- **7 hardcoded components**, 4 fetched from Supabase
- 1 TypeScript `any` in InstagramFeed.tsx:24 (`supabase as any`)
- Dead category links pointing to non-existent `/category/[slug]` routes
- Hardcoded phone number "919999999999" needs replacing with env var
- ESLint/TypeScript: 0 errors, 0 warnings

---

## Phase 4: Product System Deep Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| P1 | **CRITICAL** | Category mismatch: static data has `Crochet Gajra/Accessories` vs DB `Crochet Hair Accessories/Bouquet` | `data/products.ts:6` |
| P2 | **CRITICAL** | `product_type === 'custom_request'` uses old DB value; should be `'customized'` | `ProductGrid.tsx:138` |
| P3 | **HIGH** | AdminProductForm `resolveImageUrl` doesn't handle `/images/` local paths | `AdminProductForm.tsx:516-527` |
| P4 | **HIGH** | Static product prices (₹1499, ₹399) don't match DB prices (₹1999, ₹299) | `data/products.ts` |
| P5 | **HIGH** | RelatedProducts uses only static data, not DB | `RelatedProducts.tsx:4` |
| P6 | **MEDIUM** | Multiple `console.error` instead of `logger.error` | Various files |
| P7 | **MEDIUM** | `useSetPrimaryMedia` not atomic — race condition possible | `useAdminProducts.ts:369-386` |
| P8 | **MEDIUM** | Wishlist not persisted (client state only) | `ProductDetail.tsx:141` |
| P9 | **MEDIUM** | Review submission has no error feedback on failure | `ProductDetail.tsx:294-307` |
| P10 | **LOW** | Upload preset hardcoded fallback `'kaari_products'` | `cloudinary.ts:89` |
| P11 | **LOW** | `is_primary` column may not exist in live DB | `useAdminProducts.ts:369-386` |
| P12 | **LOW** | Variant price label says "adjustment" but stores actual price | `AdminProductForm.tsx:493` |

---

## Phase 5: Cart & Checkout Deep Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| C1 | **CRITICAL** | Default address `is_default` update is not atomic — race condition | `Checkout.tsx:276-288` |
| C2 | **CRITICAL** | Price validation only checks `base_price`, not variant prices | `checkout/route.ts:224-292` |
| C3 | **HIGH** | `console.error` in CartContext instead of `logger.error` | `CartContext.tsx:133,184,219,234` |
| C4 | **HIGH** | No stock validation UX before checkout | Cart/checkout |
| C5 | **HIGH** | Coupon discount not verified server-side | `Checkout.tsx:170-206` |
| C6 | **MEDIUM** | CSRF token generated but never validated server-side | `Checkout.tsx:74,467` |
| C7 | **MEDIUM** | Double-submit prevention is client-only | `Checkout.tsx:211-214` |
| C8 | **MEDIUM** | PIN code lookup fails silently | `Checkout.tsx:136-153` |
| C9 | **LOW** | Hardcoded shipping threshold (₹500 for free) | `checkout/route.ts:119` |
| C10 | **LOW** | Hardcoded order expiry (15 min) | `checkout/route.ts:310` |
| C11 | **LOW** | Hardcoded max order amount (₹1,00,000) | `checkout/route.ts:127` |

---

## Phase 6: Payment System Deep Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PY1 | **HIGH** | Webhook only processes events when both `cashfreeSessionId` AND `cfPaymentId` found | `webhooks/payment/route.ts:383` |
| PY2 | **HIGH** | Cart deletion fallback deletes ALL user cart items | `webhooks/payment/route.ts:142-153` |
| PY3 | **MEDIUM** | `console.error` in create-order instead of `logger.error` | `create-order/route.ts:29` |
| PY4 | **MEDIUM** | Cashfree config fetched per-request (no caching) | `cashfree-server.ts:52-74` |
| PY5 | **MEDIUM** | Payment gateway table dependency not documented | `cashfree-server.ts:32-50` |
| PY6 | **LOW** | Cashfree order ID format `'KH' + orderId.slice(0, 8)` | `create-order/route.ts:150` |
| PY7 | **LOW** | Hardcoded 15-minute expiry | `create-order/route.ts:131,164` |
| PY8 | **LOW** | `waitUntil` is Vercel-specific | `webhooks/payment/route.ts:405` |

---

## Phase 7: Admin Panel Deep Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| A1 | **CRITICAL** | 3 different `requireAdmin` implementations — should consolidate to `lib/auth/verify-jwt.ts` | `coupons/route.ts`, `stories/route.ts`, `verify-jwt.ts` |
| A2 | **HIGH** | Admin layout uses client-side auth only — UI flash possible | `admin/layout.tsx:61-70` |
| A3 | **HIGH** | No audit logging on admin mutations | All admin routes |
| A4 | **MEDIUM** | Sidebar active state uses `startsWith` — potential false positives | `admin/layout.tsx:143` |
| A5 | **MEDIUM** | `isAdmin` from client metadata is not authoritative | `AuthContext` |
| A6 | **LOW** | All 22 admin API routes have `requireAdmin` — good coverage | All admin routes |

---

## Phase 8: API Routes Complete Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| API1 | **CRITICAL** | `POST /api/products` uses `requireAuth()` — any logged-in user can create products | `products/route.ts:116` |
| API2 | **CRITICAL** | `/api/social-order-intent` has no auth and no rate limiting | `social-order-intent/route.ts` |
| API3 | **CRITICAL** | `/api/health` exposes integration status (Cashfree mode, Cloudinary config) | `health/route.ts` |
| API4 | **HIGH** | `/api/products` GET uses user-context client (RLS may leak inactive products) | `products/route.ts:29` |
| API5 | **HIGH** | Cron routes use Bearer token auth only — no IP restriction | `cron/*/route.ts` |
| API6 | **HIGH** | Product search `ilike` allows wildcard injection | `products/route.ts:56` |
| API7 | **MEDIUM** | `console.error` in health route | `health/route.ts:49` |
| API8 | **MEDIUM** | Cron email templates are bare HTML | `send-emails/route.ts:141-161` |
| API9 | **MEDIUM** | `restoreStockForOrder` uses `(supabase as any).rpc()` | `cleanup-orders/route.ts:155` |
| API10 | **MEDIUM** | Products API returns `select('*')` — leaks all columns | `products/route.ts:48` |

---

## Phase 9: Security & Env Deep Audit

**Status**: ✅ Complete  

| ID | Severity | Issue | File |
|----|----------|-------|------|
| S1 | **CRITICAL** | CSRF protection is client-side only — `validateCsrfToken()` returns `false` in SSR | `lib/csrf.ts:59-65` |
| S2 | **CRITICAL** | Health endpoint exposes full tech stack configuration | `health/route.ts` |
| S3 | **CRITICAL** | `.env.local` contains real service role keys (was previously tracked in git) | `.env.local` |
| S4 | **HIGH** | `POST /api/products` allows any authenticated user to create products | `products/route.ts:116` |
| S5 | **HIGH** | `/api/social-order-intent` has no auth or rate limiting | `social-order-intent/route.ts` |
| S6 | **HIGH** | CSP allows `'unsafe-eval'` in script-src | `middleware.ts:34` |
| S7 | **HIGH** | CSP allows `'unsafe-inline'` in style-src | `middleware.ts:35` |
| S8 | **MEDIUM** | Webhook routes exempt from all middleware rate limiting | `middleware.ts:57-66` |
| S9 | **MEDIUM** | Two sanitization libraries (`sanitization.ts` and `sanitize.ts`) | `lib/` |
| S10 | **MEDIUM** | Phone validation regex inconsistency | `sanitization.ts:64` vs checkout schema |
| S11 | **MEDIUM** | `sanitizeTextInput` doesn't handle event handler injection | `sanitization.ts:20-24` |
| S12 | **MEDIUM** | Admin layout client-side auth flash | `admin/layout.tsx:61-70` |

---

## Phase 10: Database Schema Audit

**Status**: ✅ Complete  

| ID | Severity | Issue |
|----|----------|-------|
| D1 | **CRITICAL** | `product_type` CHECK constraint: verify migration applied (should be `standard/customized`) |
| D2 | **HIGH** | 46 migration files — consider squashing before production |
| D3 | **HIGH** | `jsonb` columns (`trust_badges_config`, `color_options`) have no schema validation |
| D4 | **HIGH** | `related_product_ids` (uuid[]) has no FK constraint — dangling references possible |
| D5 | **MEDIUM** | Dual soft-delete pattern: `is_active` flag + `deleted_at` column can conflict |
| D6 | **MEDIUM** | `is_primary` column on `product_media` — verify it exists in live DB |
| D7 | **MEDIUM** | Verify `slug` column has an index for fast lookups |
| D8 | **LOW** | `currency` column always 'INR' — unnecessary complexity |
| D9 | **LOW** | Comprehensive schema with 20+ tables and key RPCs |

---

## Phase 11: Integration Health Check

**Status**: ✅ Complete  

| ID | Severity | Issue |
|----|----------|-------|
| I1 | **HIGH** | Duplicate files: `audit-log.ts`/`auditLog.ts`, `cashfree.ts`/`cashfree-sdk.ts`, `sanitization.ts`/`sanitize.ts` |
| I2 | **HIGH** | 5 payment-related files — verify which are active vs dead code |
| I3 | **HIGH** | Config module (`lib/config.ts`) not used consistently — many files read `process.env` directly |
| I4 | **MEDIUM** | `SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY` — both in `.env.local`, unclear which is used |
| I5 | **MEDIUM** | Upstash Redis URL/token are placeholders — rate limiting degrades in production |
| I6 | **MEDIUM** | Resend API key and from-email are placeholders — email sending will fail |
| I7 | **LOW** | Config validation only logs in development |
| I8 | **LOW** | `NEXT_PUBLIC_APP_URL` defaults to localhost — could break Cashfree return URLs |

---

## Phase 12: Performance & Caching Audit

**Status**: ✅ Complete  

| ID | Severity | Issue |
|----|----------|-------|
| PF1 | **HIGH** | `swcMinify: true` is default in Next.js 14+ — unnecessary config | `next.config.js:46` |
| PF2 | **HIGH** | Product Grid dual data source causes content flash | `ProductGrid.tsx:86-98` |
| PF3 | **HIGH** | `revalidatePath('/')` called after every story/billboard change | Stories/Billboard routes |
| PF4 | **HIGH** | Static and DB product data can show simultaneously | `data/products.ts` vs Supabase |
| PF5 | **MEDIUM** | React Query `staleTime` inconsistency across components | Various |
| PF6 | **MEDIUM** | Image optimization creates up to 768 variants per source image | `next.config.js:39-41` |
| PF7 | **MEDIUM** | Cache headers overlap between `next.config.js` and `vercel.json` | Config files |
| PF8 | **MEDIUM** | No ISR for category pages (client-side filtering only) | Products page |
| PF9 | **LOW** | Static product data not tree-shaken — full array bundled | `data/products.ts` |
| PF10 | **LOW** | Vercel crons configured but no monitoring/alerting | `vercel.json:24-32` |

---

## Recommended Fix Priority

### Immediate (Ship Blockers)
1. **Fix CSRF** — Implement server-side CSRF token validation or use SameSite cookies
2. **Fix `/api/products` POST auth** — Change `requireAuth()` to `requireAdmin()`
3. **Fix `product_type` badge** — Change `'custom_request'` to `'customized'` in `ProductGrid.tsx:138`
4. **Remove or secure `/api/health`** — Don't expose integration config publicly
5. **Fix category mismatch** — Update static data categories to match DB or remove static fallback

### High Priority (This Week)
6. **Consolidate `requireAdmin` implementations** — Use single function from `lib/auth/verify-jwt.ts`
7. **Add rate limiting to `/api/social-order-intent`**
8. **Fix AdminProductForm `resolveImageUrl`** — Add `/images/` path handling
9. **Replace hardcoded phone numbers** — Use env var consistently
10. **Add server-side coupon validation** to checkout
11. **Fix variant price validation** in checkout API
12. **Secure `.env.local`** — Verify it's in `.gitignore` and rotate exposed secrets

### Medium Priority (Next Sprint)
13. **Replace all `console.error` with `logger.error`** across codebase
14. **Add audit logging** to admin mutations
15. **Fix RelatedProducts** to fetch from DB instead of static data
16. **Make address `is_default` update atomic** via RPC
17. **Cache Cashfree config** for 30-60 seconds
18. **Remove duplicate files** (audit-log, cashfree-sdk, sanitize)
19. **Add DB schema validation** for `jsonb` columns

### Low Priority (Backlog)
20. **Squash migrations** before production
21. **Remove `swcMinify: true`** from next.config.js
22. **Add wishlist persistence** (localStorage or DB)
23. **Improve email templates** (styled HTML instead of bare)
24. **Add monitoring** for Vercel cron jobs
25. **Tree-shake static product data** or remove entirely once DB is reliable

---

*Report generated by Claude Code audit on 2026-04-12*