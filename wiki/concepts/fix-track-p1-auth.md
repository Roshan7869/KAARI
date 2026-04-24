---
type: concept
title: "Fix Track P1 — Standardize Admin Auth Pattern"
tags: [fix-plan, high, auth, consistency]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
  - wiki/entities/middleware-ts
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P1 — Standardize Admin Auth Pattern

## Problem

3 different admin auth patterns exist across 29 admin API routes:

| Pattern | Used In | Routes |
|---------|---------|--------|
| A: `requireAdmin()` from `@/lib/auth/verify-jwt` | Newer routes | ~10 |
| B: Manual `auth()` + role check | Older routes | ~18 |
| C: Inline `requireAdmin()` | Stories route | 1 |

## Target: Single Pattern

Use `requireAdmin()` from `@/lib/auth/verify-jwt` everywhere:

```typescript
import { requireAdmin } from '@/lib/auth/verify-jwt';

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck; // Returns 401/403 if not admin
  // ... admin logic
}
```

## Steps

1. **Identify** all routes using Pattern B (manual `auth()` check)
2. **Replace** with `requireAdmin()` import and call
3. **Delete** inline `requireAdmin` function from `app/api/admin/stories/route.ts`
4. **Remove** redundant `const { userId } = await auth()` calls that follow `requireAdmin()`
5. **Verify** middleware still provides edge-level protection

## Routes to Update (Pattern B → Pattern A)

- `app/api/admin/audit/route.ts`
- `app/api/admin/billboard/route.ts`
- `app/api/admin/coupons/route.ts`
- `app/api/admin/coupons/[id]/route.ts`
- `app/api/admin/customers/[id]/route.ts`
- `app/api/admin/export/route.ts`
- `app/api/admin/features/route.ts`
- `app/api/admin/inventory/route.ts`
- `app/api/admin/inventory/[variantId]/route.ts`
- `app/api/admin/media/route.ts`
- `app/api/admin/media/delete/route.ts`
- `app/api/admin/media/delete-asset/route.ts`
- `app/api/admin/orders/route.ts`
- `app/api/admin/orders/[id]/route.ts`
- `app/api/admin/orders/[id]/tracking/route.ts`
- `app/api/admin/products/import/route.ts`
- `app/api/admin/reviews/route.ts`
- `app/api/admin/reviews/[id]/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/settings/payment/route.ts`
- `app/api/admin/stats/route.ts`

## Route to Fix (Pattern C → Pattern A)

- `app/api/admin/stories/route.ts` — delete inline `requireAdmin`, import from verify-jwt

## Verification

- All admin routes use `requireAdmin()` from `@/lib/auth/verify-jwt`
- Non-admin user gets 403 on all `/api/admin/*` routes
- `npm run type-check` passes

## Links

- [[fix-plan-master]] — master plan
- [[middleware-ts]] — edge-level admin protection
- [[security-posture]] — defense in depth