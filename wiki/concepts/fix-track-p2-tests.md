---
type: concept
title: "Fix Track P2 — Add Core Test Coverage + Fix Env Exposure"
tags: [fix-plan, medium, testing, security]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P2 — Add Core Test Coverage + Fix Env Exposure

## Problem A: Near-Zero Test Coverage

59 API routes, 62 lib files, 13 hooks, 100+ components — only 1 E2E test exists. No unit or integration tests.

## Problem B: NEXT_PUBLIC_CLOUDINARY_API_KEY Used Server-Side

3 admin routes + `cloudinary-server.ts` fall back to `NEXT_PUBLIC_CLOUDINARY_API_KEY` when the server-only `CLOUDINARY_API_KEY` is missing. This exposes a key that shouldn't be public.

## Test Priority Order

### 1. Payment Flow Integration Test (Critical Path)

```
__tests__/integration/payment-flow.test.ts

Test: Guest adds to cart → signs up → checkout → create order → webhook → payment confirm
```

### 2. Auth Middleware Test (Security)

```
__tests__/integration/middleware.test.ts

Test: Public routes accessible without auth
Test: Protected routes redirect to login
Test: Admin routes require admin role
Test: Auth pages redirect logged-in users
```

### 3. Cart Logic Unit Tests (Business Logic)

```
__tests__/unit/cart.test.ts

Test: Add item to cart
Test: Remove item from cart
Test: Update quantity
Test: Merge guest cart on login
Test: Apply coupon
Test: Cart total calculation
```

### 4. API Validation Tests (Input Security)

```
__tests__/unit/validation.test.ts

Test: Zod schemas reject invalid input
Test: sanitizeTextInput blocks XSS
Test: sanitizeSearchQuery blocks SQL injection
Test: CSRF validation works
Test: Rate limiting returns 429
```

### 5. RLS Tests (Data Security)

```
__tests__/integration/rls.test.ts

Test: User A cannot read User B's cart
Test: User A cannot read User B's orders
Test: Non-admin cannot access admin endpoints
Test: User can only modify their own reviews
```

## Env Exposure Fix

### Current (Vulnerable)

```typescript
// lib/cloudinary-server.ts:10
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
```

### Fix

```typescript
// lib/cloudinary-server.ts
const apiKey = process.env.CLOUDINARY_API_KEY;
if (!apiKey) {
  throw new Error('CLOUDINARY_API_KEY environment variable is required');
}
```

### Affected Files

- `lib/cloudinary-server.ts` — remove NEXT_PUBLIC_ fallback
- `app/api/admin/media/route.ts` — verify uses cloudinary-server
- `app/api/admin/media/delete-asset/route.ts` — verify
- `app/api/admin/stories/route.ts` — verify

### After Fix

Ensure `CLOUDINARY_API_KEY` is set in:
- `.env.local` (local dev)
- Vercel Env Variables (production)
- `.env.example` (documentation)

`NEXT_PUBLIC_CLOUDINARY_API_KEY` stays for unsigned client-side uploads only.

## Steps

1. Fix env exposure first (quick win)
2. Write test infrastructure: test helpers, mock factories, Supabase test client
3. Write payment flow integration test
4. Write middleware test
5. Write cart unit tests
6. Write validation tests
7. Write RLS integration tests
8. Add `npm run test` to CI pipeline

## Links

- [[fix-plan-master]] — master plan
- [[security-posture]] — input validation context