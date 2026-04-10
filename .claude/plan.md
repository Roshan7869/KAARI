# Kaari Security Fix Plan — Validated Against Codebase

## Key Corrections vs Original Fix Document

The original fix document assumed Supabase auth (`requireAuth(request)` with cookies). **The app uses Clerk** (`auth()` from `@clerk/nextjs/server`). The `requireAdmin()` already exists in `lib/auth/verify-jwt.ts` using Clerk session claims — it just isn't used. Most admin routes already do inline Clerk auth correctly; only 3 routes are broken.

---

## CRITICAL FIXES (7)

### Fix #1 — Replace requireAuth() with requireAdmin() on broken admin routes
**Reality check**: Only 3 routes need fixing, not "all":
- `app/api/admin/products/route.ts` — uses `requireAuth()` (4 handlers)
- `app/api/admin/stats/route.ts` — uses `requireAuth()` (1 handler)
- `app/api/admin/settings/route.ts` GET — zero auth (PUT already has inline Clerk auth)

**Action**: Replace `requireAuth()` → `requireAdmin()` in products and stats. Add `requireAdmin()` to settings GET. The existing `requireAdmin()` from `lib/auth/verify-jwt.ts` works — no need to create a new one.

**Do NOT touch**: billboard, coupons, media, tracking routes — they already have correct inline Clerk auth.

### Fix #2 — Add middleware-level admin guard for /api/admin/*
**Reality check**: Middleware uses `clerkMiddleware`, not raw Supabase. The fix document's Supabase query approach is wrong.

**Action**: In `middleware.ts`, before the `/api/` early return (lines 67-71), add:
```ts
if (pathname.startsWith('/api/admin')) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // fall through to CSP header logic
}
```
This uses Clerk's `auth()` which the middleware already has access to via `clerkMiddleware`.

### Fix #3 — Payment bypass: client declares payment status
**Reality check**: Confirmed. `complete/route.ts` passes client `status` to RPC without Cashfree verification.

**Action**: Remove `status` from request body destructuring. After extracting `sessionId`, call Cashfree API to verify payment status server-side before calling `complete_payment_session` RPC.

### Fix #4 — Payment session verify: client-controllable ownership bypass
**Reality check**: Confirmed. `requireOwnership: boolean` from client body controls whether user_id filtering happens.

**Action**: Remove `requireOwnership` parameter entirely. Always pass `userId` to the RPC. Never accept a client-controlled bypass flag.

### Fix #5 — Admin reviews: client-side Supabase mutations
**Reality check**: Confirmed. `app/admin/reviews/page.tsx` does 7 direct Supabase mutations from the browser.

**Action**: Create `app/api/admin/reviews/[id]/route.ts` with PATCH (update status/visibility) and DELETE handlers, all using `requireAdmin()`. Update the reviews page to call these API routes instead of direct Supabase.

### Fix #6 — Payment credentials exposed via client-side Supabase
**Reality check**: Confirmed. `app/admin/settings/payment/page.tsx` reads/writes `api_key`, `api_secret`, `webhook_secret` via browser Supabase.

**Action**: Create `app/api/admin/settings/payment/route.ts` — GET returns masked credentials, POST writes them server-side. Update the payment page to use fetch() instead of direct Supabase. Never return `api_secret` or `webhook_secret` to the client.

### Fix #7 — Mass assignment in coupon PATCH
**Reality check**: Confirmed. `body` passed directly to `supabase.update(body)` with `as any` cast.

**Action**: Add Zod schema `UpdateCouponSchema` that whitelists only `description`, `is_active`, `valid_until`, `usage_limit`, `min_order_amount`, `max_discount_amount`. Parse body with schema before update. Remove `as any` cast.

---

## HIGH FIXES (8)

### Fix #8 — Webhook fire-and-forget in serverless
**Reality check**: Confirmed. `processWebhookInBackground().catch()` is fire-and-forget.

**Action**: Replace with `waitUntil()` from `@vercel/functions`. If not available, process synchronously before returning 200 (Cashfree waits up to 30s).

### Fix #9 — TOCTOU race in webhook deduplication
**Reality check**: Confirmed. SELECT then INSERT pattern.

**Action**: Replace with atomic INSERT. Catch Postgres unique violation error (code `23505`) to detect duplicates. Ensure `webhook_events` has `UNIQUE(cf_payment_id, event_type)` constraint.

### Fix #10 — Refund webhook sets status unconditionally
**Reality check**: Confirmed. No status guard on refund, unlike success handler.

**Action**: Add state machine guard — only allow refund from valid states. Use optimistic lock (`.eq('status', currentOrder.status)`) on the update.

### Fix #11 — Profile update: no input validation
**Reality check**: Confirmed. No Zod, `as unknown as Record<string, unknown>` cast, no sanitization.

**Action**: Add Zod `UpdateProfileSchema` whitelisting `full_name`, `phone`, `avatar_url`, notification preferences. Remove unsafe cast.

### Fix #12 — Non-timing-safe webhook signature comparison
**Reality check**: The PRIMARY function `verifyCashfreeWebhookSignature` already uses `timingSafeEqual`. Only the **unused** `verifyCashfreeWebhookSignatureNode` uses `===`.

**Action**: Delete or fix `verifyCashfreeWebhookSignatureNode`. Replace `===` with `timingSafeEqual` or remove the function if truly unused.

### Fix #13 — is_verified_purchase set by client
**Reality check**: WORSE than the document describes. The `order_items` query doesn't even filter by `user_id` — it checks if ANY order exists for the product.

**Action**: Remove `is_verified_purchase` from request body destructuring. Query `order_items` with `user_id` filter. Always compute server-side.

### Fix #14 — Two conflicting sanitization modules
**Reality check**: Only 1 file imports the weaker module (`lib/product-media.ts` for `sanitizeFilePath`). The `sanitizeTextInput` difference is moot since nobody imports it from the weak module.

**Action**: Move `sanitizeFilePath` to `lib/sanitization.ts`. Update the single import in `lib/product-media.ts`. Delete `lib/sanitize.ts`. Add `vbscript:` and other dangerous protocol checks to `sanitizeUrl`.

### Fix #15 — createAdminClient() for user-scoped queries
**Reality check**: Widespread — 12 user-facing routes use admin client, bypassing RLS.

**Action**: Replace `createAdminClient()` with `createClient()` from `lib/supabase/server.ts` in user-scoped routes: auth/me, cart, checkout, orders/return, reviews, payment-session, coupons/validate. Keep admin client ONLY for: admin routes, webhook handler, cron jobs, payment order creation.

---

## MEDIUM FIXES (10)

### Fix #16 — Middleware /api/ skip logic
Add comment documenting the security model. No code change needed beyond Fix #2.

### Fix #17 — CSP unsafe-inline in style-src
Short-term: Add CSP report endpoint. Long-term: remove unsafe-inline. Not blocking.

### Fix #18 — Admin layout: client-side-only guard
Convert to async server component with Clerk `auth()`. Use `redirect()` for non-admins. Keep client UI components as children.

### Fix #19 — Cart items deleted by user_id not cart_id
Change webhook cart deletion to filter by `cart_id` from the order record.

### Fix #20 — Social order intent: no rate limiting
Add Upstash rate limiting by IP.

### Fix #21 — Admin settings: no validation on value field
Add Zod schema for key allowlist + value type checking.

### Fix #22 — Billboard: no product_id existence check
Add existence validation before linking product to billboard slot.

### Fix #23 — Media delete: no rate limiting
Add Upstash rate limiting on bulk delete endpoint.

### Fix #24 — Cloudinary full response to client
Whitelist only safe fields (public_id, secure_url, width, height, format, bytes, created_at).

### Fix #25 — Cron routes: bearer token over GET
Remove query param token fallback. Ensure token only from Authorization header.

---

## LOW FIXES (5)

### Fix #26 — isSafeRedirectPath misses control characters
Add regex check for `[\x00-\x1f\x7f]` and unicode direction override chars.

### Fix #27 — Duplicate auth() call in checkout
Call auth() once, reuse result.

### Fix #28 — Client-side rate limiting is security theater
Add comment clarifying it's UX-only, not security. Verify server-side rate limiting exists.

### Fix #29 — Wishlist returns empty instead of 401
Return 401 for unauthenticated requests.

### Fix #30 — console.error in admin reviews
Replace with logger.error() or remove.

---

## Execution Order

### Group 1: Admin Auth (Fixes #1, #2) — commit 1
- Replace requireAuth → requireAdmin in products, stats, settings
- Add middleware admin guard for /api/admin/*
- Verify: `grep -rn "requireAuth" app/api/admin/` → 0 results
- Run: `npx tsc --noEmit`

### Group 2: Payment Security (Fixes #3, #4) — commit 2
- Server-side Cashfree verification in complete route
- Remove requireOwnership bypass in verify route
- Run: `npx tsc --noEmit`

### Group 3: Client-Side Mutation Fixes (Fixes #5, #6) — commit 3
- Create admin reviews API route
- Create payment settings API route
- Update client pages to use API routes
- Run: `npx tsc --noEmit`

### Group #4: Input Validation (Fixes #7, #11, #13) — commit 4
- Zod schema for coupon PATCH
- Zod schema for profile update
- Fix is_verified_purchase to compute server-side with user_id filter
- Run: `npx tsc --noEmit`

### Group #5: Webhook & Cashfree (Fixes #8, #9, #10, #12) — commit 5
- waitUntil for webhook processing
- Atomic INSERT deduplication
- Refund status guard
- Fix or remove verifyCashfreeWebhookSignatureNode
- Run: `npx tsc --noEmit`

### Group #6: Data Layer (Fixes #14, #15) — commit 6
- Consolidate sanitization modules
- Replace createAdminClient with createClient in user-scoped routes
- Run: `npx tsc --noEmit`

### Group #7: Medium/Low Fixes (Fixes #16–#30) — commit 7
- All remaining fixes
- Run: `npx tsc --noEmit && npm run lint`

### Final Verification
```bash
npx tsc --noEmit && npm run lint
grep -rn "requireAuth" app/api/admin/  # 0 results
grep -rn "requireAdmin" app/api/admin/  # matches every handler
ls lib/sanitize.ts  # should not exist
npm run build  # should succeed
```