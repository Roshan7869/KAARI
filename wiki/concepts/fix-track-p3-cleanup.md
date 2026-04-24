---
type: concept
title: "Fix Track P3 — Low-Priority Cleanup"
tags: [fix-plan, low, cleanup, performance]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P3 — Low-Priority Cleanup

## Fix #12: Remove Redundant AuthProvider

**Problem**: `AuthProvider` wraps Clerk's `useAuth()` without adding value. The provider tree is 9 levels deep.

**Current**: `ClerkProvider → SentryUserSync → PostHogProvider → NuqsAdapter → ErrorBoundary → QueryClientProvider → AuthProvider → CartProvider → TooltipProvider`

**Fix**: Replace `AuthProvider` with direct Clerk hook usage:
- Replace `useAuth()` calls with `useAuth()` from `@clerk/nextjs`
- Remove `contexts/AuthContext.tsx` and `app/contexts/AuthContext.tsx`
- Update all consumers (check: `useAuth()` is used in ~20 components)
- Keep `ClerkProvider` in root layout (already there)

**Risk**: Some components may use custom AuthProvider features. Audit first.

## Fix #13: Increase Stale Time

**Problem**: `staleTime: 30 * 1000` (30 seconds) in providers.tsx. Product/category data rarely changes.

**Fix**:

```typescript
// app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (was 30 seconds)
      refetchOnWindowFocus: false,
    },
  },
});
```

Product detail pages can set `staleTime: 60 * 1000` (1 min) for freshness.
Admin pages can set `staleTime: 0` for always-fresh data.

## Fix #14: Extract cashfree-mcp

**Problem**: `cashfree-mcp/` is embedded in the main project with its own `package.json`, `node_modules/`, and `dist/` directory. Not a workspace, not in `.gitignore`.

**Steps**:
1. Add `cashfree-mcp/dist/` and `cashfree-mcp/node_modules/` to `.gitignore`
2. Remove `semantic-ui-react` from `cashfree-mcp/package.json` (unused, 200KB+)
3. Option A: Configure as npm workspace in root `package.json`
4. Option B: Extract to separate repo and install as npm package

## Fix #15: Clean Stale Worktrees

**Problem**: 3 stale worktrees cluttering the repo.

```bash
rm -rf .claude/worktrees/agent-a2f6df24
rm -rf .claude/worktrees/agent-a406d507
rm -rf .git/worktrees/copilot-worktree-2026-03-31T08-46-22
```

**Steps**:
1. List stale worktrees: `git worktree list`
2. Remove each: `git worktree remove <path>`
3. Clean up `.claude/worktrees/` manually
4. Verify: `git worktree list` shows only main

## Links

- [[fix-plan-master]] — master plan