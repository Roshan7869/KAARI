---
type: entity
title: "CartContext — State Management Gap"
tags: [architecture, state-management, performance]
sources:
  - wiki/synthesis/project-audit-2026-04
created: 2026-04-23
updated: 2026-04-23
---

# CartContext (contexts/CartContext.tsx)

The shopping cart context. 489 lines managing cart state with `useState` + raw `fetch()`. Does NOT use TanStack Query despite it being available in the provider tree.

## Current Pattern

- 4 `useState` calls: items, loading, error, couponCode
- 3 `useEffect` calls: initialization, sync, merge
- Raw `fetch()` to `/api/cart`, `/api/cart/items/[id]`, `/api/cart/merge`
- Manual error handling with try/catch
- No cache, no retry, no stale-while-revalidate
- No request deduplication

## What's Missing

| Feature | TanStack Query | Current |
|---------|---------------|---------|
| Cache | Automatic | None |
| Retry | Configurable | None |
| Stale-while-revalidate | Built-in | None |
| Request dedup | Built-in | None |
| Optimistic updates | `onMutate` | None |
| Background refetch | Configurable | None |
| Devtools | React Query Devtools | None |

## Refactor Plan

See [[fix-track-p2-cart]] for the full migration plan to TanStack Query.

## Links

- [[fix-track-p2-cart]] — refactor plan
- [[fix-plan-master]] — master plan
- [[state-management-patterns]] — pattern analysis