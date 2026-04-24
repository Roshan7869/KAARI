---
type: concept
title: "Fix Track P2 — Refactor CartContext to Use TanStack Query"
tags: [fix-plan, medium, architecture, state-management]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
  - wiki/entities/cart-context
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P2 — Refactor CartContext to Use TanStack Query

## Problem

`contexts/CartContext.tsx` (489 lines) manages all cart state with `useState` + raw `fetch()`. No caching, no retry, no stale-while-revalidate, no request deduplication. Cart state is lost on page reload.

## Current Architecture

```
CartContext
  ├── useState: items, loading, error, couponCode, ...
  ├── fetch('/api/cart') — no cache, no retry
  ├── fetch('/api/cart/items/[id]') — manual error handling
  ├── fetch('/api/cart/merge') — no optimistic updates
  └── 3 useEffect for sync/initialization
```

## Target Architecture

```
CartProvider (thin wrapper)
  ├── useCart() → useQuery(['cart'])
  │     ├── automatic background refetch
  │     ├── stale-while-revalidate
  │     └── request deduplication
  ├── useAddToCart() → useMutation + optimistic update
  ├── useRemoveFromCart() → useMutation + optimistic update
  ├── useUpdateQuantity() → useMutation + optimistic update
  ├── useMergeCart() → useMutation (guest → auth)
  └── useApplyCoupon() → useMutation
```

## Steps

### Step 1: Extract Cart Hooks

Create `hooks/useCart.ts`:

```typescript
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await fetch('/api/cart');
      if (!res.ok) throw new Error('Failed to fetch cart');
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Step 2: Create Mutation Hooks

```typescript
export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: CartItemInput) =>
      fetch('/api/cart', { method: 'POST', body: JSON.stringify(item) }),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old) => addOptimisticItem(old, item));
      return { previous };
    },
    onError: (_err, _item, context) => {
      queryClient.setQueryData(['cart'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
```

### Step 3: Simplify CartContext

```typescript
export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart(); // TanStack Query hook
  const addToCart = useAddToCart();
  const removeFromCart = useRemoveFromCart();
  // ... thin provider wrapping TanStack Query state
}
```

### Step 4: Delete Raw Fetch Calls

Remove all `fetch('/api/cart...')` calls from `CartContext.tsx`. Replace with mutation hooks.

### Step 5: Add Persistence

Cart data persists in Supabase (already does for auth users). For guest users, use `localStorage` as cache with TanStack Query's `persistQueryClient`.

## Affected Files

| File | Action |
|------|--------|
| `contexts/CartContext.tsx` | Rewrite (489 → ~80 lines) |
| `hooks/useCart.ts` | Create new |
| `hooks/useCartMutations.ts` | Create new |
| `app/providers.tsx` | Verify CartProvider still wraps correctly |
| All components using `useCart()` | Verify API unchanged |

## Links

- [[fix-plan-master]] — master plan
- [[cart-context]] — current architecture detail
- [[state-management-patterns]] — pattern consistency