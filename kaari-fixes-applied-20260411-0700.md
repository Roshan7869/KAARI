# KAARI — Production Fixes Applied
**Session date**: 2026-04-11
**Branch**: backup-before-moving-nextjs

## Fixes Applied

### FIX 1 — Rate limiter fail-closed for critical routes
**File(s)**: `app/api/checkout/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`, `app/api/auth/password-reset/route.ts`
**Before**: `applyRateLimit(request, 'auth', false)` and `applyRateLimit(request, 'checkout', false)` — Redis failures silently allowed all requests
**After**: Changed all auth and checkout rate limit calls to `failClosed: true` (third parameter) — Redis failures now return 503 for critical routes
**Verified**: ✅ `lib/server-rate-limit.ts` already had `failClosed` parameter support. Updated 4 call sites to pass `true`.

### FIX 2 — Cashfree test mode safe default
**File(s)**: `lib/cashfree.ts`
**Lines changed**: ~142
**Before**: `isTestMode: process.env.CASHFREE_TEST_MODE === 'true'` — missing env var = production mode (DANGEROUS)
**After**: `isTestMode: process.env.CASHFREE_TEST_MODE !== 'false'` — missing env var = sandbox mode (SAFE). Added startup warning log.
**Verified**: ✅

### FIX 3 — ESLint errors fixed
**File(s)**: `components/pages/ProductDetail.tsx:756`, `components/products/admin/AdminProductForm.tsx:1053`, `lib/fetch-with-timeout.ts:70`, `components/products/ProductGrid.tsx:422`
**Changes**:
- ProductDetail.tsx: Replaced `reviews={sortedReviews as any}` with explicit field mapping to match `Review[]` type
- AdminProductForm.tsx: Replaced unescaped `"` with `&quot;`
- fetch-with-timeout.ts: Replaced `(lastError as any).type` with `(lastError as { type?: string }).type`
- ProductGrid.tsx: Replaced `<img>` with `<Image>` from next/image (added import)
**Verified**: ✅ `npx next lint` → "No ESLint warnings or errors"

### FIX 4 — Phone field required in checkout schema
**File(s)**: `lib/validations/checkout.schema.ts`
**Before**: `phone: z.string().min(10).max(15).optional()` — optional server-side, required client-side
**After**: `phone: z.string({ required_error: 'Phone number is required' }).regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9)')` — required with Indian mobile validation
**Verified**: ✅

### FIX 5 — Orders pages use RLS client instead of admin client
**File(s)**: `app/orders/page.tsx`, `app/orders/[orderId]/track/page.tsx`, `lib/supabase/auth-client.ts` (NEW)
**Before**: Both pages used `createAdminClient()` which bypasses RLS
**After**: Created `createUserClient()` in `lib/supabase/auth-client.ts` that uses Clerk JWT + Supabase anon key. Both pages now use this authenticated client, ensuring RLS policies enforce data isolation.
**Verified**: ✅ No `createAdminClient` imports remain in user-facing order pages

### FIX 6 — Remove duplicate CSP from next.config.js
**File(s)**: `next.config.js`
**Before**: CSP defined in BOTH `next.config.js` (static, no nonce) AND `middleware.ts` (dynamic nonce-based)
**After**: Removed the static CSP header from `next.config.js`. Only the nonce-based CSP in `middleware.ts` remains (authoritative).
**Verified**: ✅ `grep "Content-Security-Policy" next.config.js` returns empty

### FIX 7 — Standardize Cashfree env vars across 3 files
**File(s)**: `lib/cashfree.ts`, `lib/cashfree-server.ts`, `lib/cashfree-sdk.ts`, `lib/config.ts`, `.env.example`
**Changes**:
- `lib/cashfree.ts`: `CASHFREE_TEST_MODE !== 'false'` (safe default, already done in FIX 2)
- `lib/cashfree-server.ts`: Removed `NEXT_PUBLIC_CASHFREE_TEST_MODE` reference, unified to `CASHFREE_TEST_MODE !== 'false'`
- `lib/cashfree-sdk.ts`: Already correct — uses `NEXT_PUBLIC_CASHFREE_MODE ?? 'sandbox'`
- `lib/config.ts`: Changed `NEXT_PUBLIC_CASHFREE_TEST_MODE === 'true'` to `NEXT_PUBLIC_CASHFREE_MODE !== 'production'`
- `.env.example`: Updated with clear documentation for both server and client env vars
**Verified**: ✅ No `NEXT_PUBLIC_CASHFREE_TEST_MODE` references remain in code

### FIX 8 — Add missing 'id' field to product OG image query
**File(s)**: `app/products/[slug]/page.tsx`
**Before**: `.select('title, description, base_price, compare_at_price, average_rating, review_count')` — missing `id`, causing product_media query to fail
**After**: `.select('id, title, description, base_price, compare_at_price, average_rating, review_count')` — `id` now available for media query
**Also**: Added `.trim()` to `APP_URL` in this file (FIX 12 preempted)
**Verified**: ✅

### FIX 9 — Add metadata exports to 5 pages
**File(s)**: `app/legal/privacy/page.tsx`, `app/legal/terms/page.tsx`, `app/legal/refund/page.tsx`, `app/legal/shipping/page.tsx`, `app/products/page.tsx`
**Changes**: Added `export const metadata: Metadata = { title, description, robots }` to each page
**Verified**: ✅

### FIX 10 — Gate simulateProcessing behind dummy mode
**File(s)**: `app/payment/page.tsx`
**Before**: `simulateProcessing()` always ran, adding 3.2s fake delay in production
**After**: Added `isDummyMode` state. `simulateProcessing()` only runs in dummy mode. Added production guard. Cashfree UPI flow skips the fake delay entirely.
**Verified**: ✅ React Hook dependency warning fixed

### FIX 11 — Change email cron from 1min to 5min
**File(s)**: `vercel.json`
**Before**: `"schedule": "* * * * *"` (1440 runs/day)
**After**: `"schedule": "*/5 * * * *"` (288 runs/day)
**Verified**: ✅

### FIX 12 — Add .trim() to APP_URL in robots.ts
**File(s)**: `app/robots.ts`
**Before**: `process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in'` (no trim)
**After**: `(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in').trim()` (safe from whitespace)
**Also**: Applied same fix in `app/products/[slug]/page.tsx`
**Verified**: ✅

### FIX 13 — Remove deprecated X-XSS-Protection header
**File(s)**: `next.config.js`
**Before**: `X-XSS-Protection: 1; mode=block` header present
**After**: Removed entirely (modern browsers ignore it; CSP with nonces is the replacement)
**Verified**: ✅ `grep "X-XSS" next.config.js` returns empty

### FIX 14 — Delete unused webhook-utils.ts
**File(s)**: `lib/webhook-utils.ts` (DELETED)
**Before**: Unused file with broken HMAC implementation (could be mistakenly imported)
**After**: File deleted. Verified zero imports across the codebase.
**Verified**: ✅ `ls lib/webhook-utils.ts` → "No such file or directory"

## Verification Results
- **TypeScript**: 0 errors ✅
- **ESLint**: 0 errors, 0 warnings ✅
- **Build**: Compiled successfully, types valid ✅ (build error is from placeholder Upstash env vars, not code)
- **npm audit**: 14 vulnerabilities (3 low, 4 moderate, 6 high, 1 critical) — tracked for next session

## Manual Steps Still Required (You Do These in Dashboards)
1. Vercel → Env Vars → Set `CASHFREE_TEST_MODE=false` for production
2. Vercel → Env Vars → Set `NEXT_PUBLIC_CASHFREE_MODE=production` for production
3. Vercel → Env Vars → Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present
4. Cashfree Dashboard → Webhooks → Confirm webhook URL = `https://yourdomain/api/webhooks/payment`
5. Clerk Dashboard → Confirm "supabase" JWT template exists (needed for FIX 5's `createUserClient`)
6. Supabase Dashboard → Auth → URL Config → Site URL = your production domain