---
type: concept
title: "Fix Track P1 — Add CSRF Protection to All Mutations"
tags: [fix-plan, high, security, csrf]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
  - wiki/entities/middleware-ts
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P1 — Add CSRF Protection to All Mutations

## Problem

Only 1 of 60+ API routes validates CSRF tokens. The middleware sets a CSRF cookie, but only `/api/checkout` reads it. All other mutation endpoints are vulnerable to cross-site request forgery.

## How CSRF Works Here

1. Middleware sets `csrf_token` cookie on protected routes (already implemented)
2. Client reads cookie and sends as `X-CSRF-Token` header
3. Server validates: cookie value === header value

## Fix Pattern

### Before (Vulnerable)

```typescript
export async function POST(request: Request) {
  // No CSRF check — any cross-origin form post works
  const body = await request.json();
  // ...
}
```

### After (Protected)

```typescript
import { validateCsrf } from '@/lib/csrf-server';

export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;
  const body = await request.json();
  // ...
}
```

## Steps

1. **Verify** `validateCsrf()` from `@/lib/csrf-server.ts` works correctly
2. **Add** `validateCsrf(request)` call to all POST/PUT/PATCH/DELETE handlers
3. **Skip** webhook routes (they verify via signature, not CSRF)
4. **Skip** GET routes (CSRF is not applicable to safe methods)
5. **Delete** unused `@/lib/csrf.ts` (142 lines, 0 imports)
6. **Test**: mutations fail without CSRF token, succeed with it

## Routes to Add CSRF Validation

### User Mutation Routes
- `app/api/cart/route.ts` — POST, DELETE
- `app/api/cart/items/[id]/route.ts` — PUT, DELETE
- `app/api/cart/merge/route.ts` — POST
- `app/api/checkout/route.ts` — POST (already has it, verify)
- `app/api/contact/route.ts` — POST
- `app/api/orders/[id]/cancel/route.ts` — POST
- `app/api/orders/[id]/return/route.ts` — POST
- `app/api/payment-session/complete/route.ts` — POST
- `app/api/payment-session/verify/route.ts` — POST
- `app/api/payments/cashfree/create-order/route.ts` — POST
- `app/api/products/[id]/reviews/route.ts` — POST
- `app/api/reviews/route.ts` — POST
- `app/api/reviews/[id]/route.ts` — PATCH, DELETE
- `app/api/social-order-intent/route.ts` — POST
- `app/api/wishlist/route.ts` — POST
- `app/api/coupons/validate/route.ts` — POST

### Admin Mutation Routes
- `app/api/admin/billboard/route.ts` — PUT
- `app/api/admin/coupons/route.ts` — POST
- `app/api/admin/coupons/[id]/route.ts` — PATCH, DELETE
- `app/api/admin/customers/[id]/route.ts` — PATCH
- `app/api/admin/features/route.ts` — PATCH
- `app/api/admin/inventory/[variantId]/route.ts` — PATCH
- `app/api/admin/media/delete/route.ts` — DELETE
- `app/api/admin/media/delete-asset/route.ts` — DELETE
- `app/api/admin/orders/route.ts` — POST
- `app/api/admin/orders/[id]/route.ts` — PATCH
- `app/api/admin/orders/[id]/tracking/route.ts` — PATCH
- `app/api/admin/products/route.ts` — POST
- `app/api/admin/products/import/route.ts` — POST
- `app/api/admin/reviews/[id]/route.ts` — PATCH, DELETE
- `app/api/admin/reviews/bulk/route.ts` — POST
- `app/api/admin/settings/route.ts` — PUT
- `app/api/admin/settings/payment/route.ts` — POST
- `app/api/admin/stories/route.ts` — POST, PATCH, DELETE

### Skip (Webhook routes — use signature verification)
- `app/api/webhooks/clerk/route.ts`
- `app/api/webhooks/payment/route.ts`

## Verification

- [ ] All mutation routes return 403 without CSRF token
- [ ] All mutation routes succeed with valid CSRF token
- [ ] Webhook routes still work (no CSRF required)
- [ ] GET routes unaffected

## Links

- [[fix-plan-master]] — master plan
- [[middleware-ts]] — CSRF cookie generation
- [[security-posture]] — defense in depth