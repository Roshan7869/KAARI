---
type: concept
title: "Fix Track P1 — Expand Rate Limiting Coverage"
tags: [fix-plan, high, security, rate-limit]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P1 — Expand Rate Limiting Coverage

## Problem

Only 7 out of 60+ API routes have rate limiting. Critical mutation endpoints (cart, orders, payments) are unprotected against abuse.

## Current Rate Limit Coverage

Routes WITH rate limiting: auth login/signup, contact, health, checkout, products (partial).

Routes WITHOUT rate limiting: cart, orders, reviews, wishlist, search, webhooks, payment completion, admin routes.

## Proposed Rate Limit Tiers

| Tier | Limit | Routes |
|------|-------|--------|
| **Auth** | 5 requests/min | login, signup, password-reset |
| **Mutation** | 20 requests/min | cart, orders, reviews, wishlist, coupons, contact |
| **Payment** | 10 requests/min | checkout, cashfree create-order, payment complete/verify |
| **Search** | 30 requests/min | search suggestions, products listing |
| **Webhook** | 100 requests/min | clerk webhook, payment webhook |
| **Admin** | 60 requests/min | all `/api/admin/*` routes |
| **Read** | 120 requests/min | health, products GET, reviews GET |

## Fix Pattern

### Before (No Rate Limit)

```typescript
export async function POST(request: Request) {
  // No rate limiting — unlimited requests
  const body = await request.json();
  // ...
}
```

### After (With Rate Limit)

```typescript
import { applyRateLimit } from '@/lib/server-rate-limit';

export async function POST(request: Request) {
  const rateLimitError = await applyRateLimit(request, 'mutation');
  if (rateLimitError) return rateLimitError;
  const body = await request.json();
  // ...
}
```

## Steps

1. **Define tiers**: Add tier configuration to `lib/server-rate-limit.ts`
2. **Apply to mutation routes**: Cart, orders, reviews, wishlist, contact, coupons
3. **Apply to payment routes**: Lower limit (10/min) for payment endpoints
4. **Apply to search routes**: Medium limit (30/min) for search suggestions
5. **Apply to webhook routes**: Higher limit (100/min) with IP-based tracking
6. **Apply to admin routes**: Standard limit (60/min) per admin user
7. **Update docs**: `docs/api/rate-limit.md` with new tier definitions
8. **Test**: Verify 429 response when limit exceeded

## Routes to Add Rate Limiting

### Mutation Tier (20/min)
- `app/api/cart/route.ts`
- `app/api/cart/items/[id]/route.ts`
- `app/api/cart/merge/route.ts`
- `app/api/orders/[id]/cancel/route.ts`
- `app/api/orders/[id]/return/route.ts`
- `app/api/reviews/route.ts`
- `app/api/reviews/[id]/route.ts`
- `app/api/products/[id]/reviews/route.ts`
- `app/api/wishlist/route.ts`
- `app/api/coupons/validate/route.ts`

### Payment Tier (10/min)
- `app/api/payment-session/complete/route.ts`
- `app/api/payment-session/verify/route.ts`
- `app/api/payments/cashfree/create-order/route.ts`

### Search Tier (30/min)
- `app/api/search/suggestions/route.ts`
- `app/api/products/route.ts` (GET only)

### Webhook Tier (100/min)
- `app/api/webhooks/clerk/route.ts`
- `app/api/webhooks/payment/route.ts`

## Links

- [[fix-plan-master]] — master plan
- [[security-posture]] — abuse prevention layer