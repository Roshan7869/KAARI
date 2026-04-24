---
type: concept
title: "State Management Patterns — Inconsistency Analysis"
tags: [architecture, state-management, consistency]
sources:
  - wiki/synthesis/project-audit-2026-04
created: 2026-04-23
updated: 2026-04-23
---

# State Management Patterns

The project uses 3 different state management patterns with no clear convention for when to use each.

## Pattern A: TanStack Query (Preferred)

Used in ~20 files. Properly cached, stale-while-revalidate, request deduplication.

```typescript
const { data } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});
```

**Used in**: admin hooks (useAdminProducts, useAdminOrders, useAdminDashboard), product detail, feature flags.

## Pattern B: Direct Supabase Client + useState

Used in ~8 files. No caching, no retry, no background refetch.

```typescript
const [data, setData] = useState(null);
useEffect(() => {
  supabase.from('table').select('*').then(setData);
}, []);
```

**Used in**: CartContext, NotificationCenter, WishlistButton, ProductCustomization, AdminCustomers, DummyPayment, useFeatureFlag (partial).

## Pattern C: Raw fetch() to API Routes

Used in CartContext exclusively.

```typescript
const [loading, setLoading] = useState(true);
const res = await fetch('/api/cart', { method: 'POST', body: JSON.stringify(data) });
```

**Used in**: CartContext only.

## Decision Framework

| Data Type | Pattern | Why |
|-----------|---------|-----|
| Server data (products, orders, reviews) | TanStack Query | Needs cache, refetch, dedup |
| User actions (add to cart, submit review) | TanStack Mutation + optimistic | Needs rollback on error |
| UI-only state (modals, tabs, form inputs) | `useState` | No server sync needed |
| URL state (filters, page, search) | `nuqs` | URL is source of truth |
| Global client state (auth, cart count) | Context over Query | Context provides sync API |

## Links

- [[fix-track-p2-cart]] — CartContext refactor to TanStack Query
- [[cart-context]] — current architecture
- [[fix-plan-master]] — master plan