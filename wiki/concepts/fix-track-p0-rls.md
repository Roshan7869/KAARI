---
type: concept
title: "Fix Track P0 — Enforce RLS on User-Facing Routes"
tags: [fix-plan, critical, security, rls, database]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
  - wiki/entities/supabase-server-ts
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P0 — Enforce RLS on User-Facing Routes

## Problem

46 API routes use `createAdminClient()` which uses the Supabase service-role key, bypassing all Row Level Security policies. User-facing routes for cart, orders, reviews, and wishlist can access any user's data.

## Route Classification

### Keep `createAdminClient` (Admin Routes — Expected)

These already require admin role and need service-role access:

- All `/api/admin/*` routes (~20 routes)
- `/api/health` (system check)
- `/api/cron/*` (background jobs)

### Switch to `createClient` (User-Facing Routes — Must Fix)

| Route | Current | Fix |
|-------|---------|-----|
| `app/api/cart/route.ts` | `createAdminClient` | `createClient` + `.eq('user_id', userId)` |
| `app/api/cart/items/[id]/route.ts` | `createAdminClient` | `createClient` + verify ownership |
| `app/api/cart/merge/route.ts` | `createAdminClient` | `createClient` + user-scoped merge |
| `app/api/checkout/route.ts` | `createAdminClient` | `createClient` for user data, `adminClient` only for order RPC |
| `app/api/orders/route.ts` | `createAdminClient` | `createClient` + `.eq('user_id', userId)` |
| `app/api/orders/[id]/cancel/route.ts` | `createAdminClient` | `createClient` + verify order ownership |
| `app/api/orders/[id]/return/route.ts` | `createAdminClient` | `createClient` + verify order ownership |
| `app/api/products/route.ts` | `createAdminClient` | `createClient` (products are public, no RLS needed) |
| `app/api/products/[id]/reviews/route.ts` | `createAdminClient` | `createClient` for reads, user-scoped for writes |
| `app/api/reviews/route.ts` | `createAdminClient` | `createClient` + `.eq('user_id', userId)` |
| `app/api/wishlist/route.ts` | `createAdminClient` | `createClient` + `.eq('user_id', userId)` |
| `app/api/payment/checkout-url/route.ts` | `createAdminClient` | `createClient` + verify order ownership |
| `app/api/payments/cashfree/create-order/route.ts` | `createAdminClient` | `createClient` for user data, `adminClient` only for payment RPC |
| `app/api/social-order-intent/route.ts` | `createAdminClient` | `createClient` + user-scoped |

## Fix Pattern

### Before (Insecure)

```typescript
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createAdminClient();
  // No user scoping — any user can see any data
  const { data } = await supabase.from('carts').select('*');
}
```

### After (Secure)

```typescript
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  // RLS enforced + explicit user scoping
  const { data } = await supabase.from('carts').select('*').eq('user_id', userId);
}
```

## Steps

1. **Inventory**: List all `createAdminClient` calls across API routes
2. **Classify**: Tag each as admin (keep) or user-facing (fix)
3. **Fix**: Replace `createAdminClient` → `createClient` + add `.eq('user_id', userId)` where needed
4. **Hybrid routes**: Some routes (checkout, payment) need both — use `createClient` for user data, `adminClient` only for specific RPCs
5. **Test**: Verify non-admin user cannot access another user's cart/orders
6. **Verify RLS policies**: Ensure Supabase RLS policies exist for all user-scoped tables

## Affected Files

~14 user-facing route files + `lib/supabase/admin.ts` (review usage)

## Links

- [[fix-plan-master]] — master plan
- [[supabase-server-ts]] — client factory details
- [[security-posture]] — RLS as defense layer