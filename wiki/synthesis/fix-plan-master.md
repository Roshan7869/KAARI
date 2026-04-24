---
type: synthesis
title: "Fix Plan — All Audit Issues (Master)"
tags: [fix-plan, critical, architecture, security, priority]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/concepts/fix-track-p0-secrets
  - wiki/concepts/fix-track-p0-rls
  - wiki/concepts/fix-track-p1-auth
  - wiki/concepts/fix-track-p1-csrf
  - wiki/concepts/fix-track-p1-bundle
  - wiki/concepts/fix-track-p1-ratelimit
  - wiki/concepts/fix-track-p2-components
  - wiki/concepts/fix-track-p2-cart
  - wiki/concepts/fix-track-p2-duplication
  - wiki/concepts/fix-track-p2-tests
  - wiki/concepts/fix-track-p3-cleanup
created: 2026-04-23
updated: 2026-04-23
---

# Fix Plan — All Audit Issues

**Lead paragraph**: Master plan to resolve all 15 audit findings across P0–P3 severity. Organized into 8 fix tracks that can run in parallel where dependencies allow. Each track links to a dedicated page with step-by-step instructions, affected files, and verification steps.

## Execution Order & Dependencies

```
Track 1: Secrets ─────────┐
Track 2: RLS ─────────────┤  Phase A (do first, no dependencies)
Track 3: Auth Pattern ────┤
Track 4: CSRF ────────────┘
         │
         ▼  (Tracks 5-8 can start after Phase A, some parallel)
Track 5: Bundle + Rate Limit ──┐
Track 6: Components + Cart ───┤  Phase B
Track 7: Duplication ──────────┤
Track 8: Tests ────────────────┘
         │
         ▼  (Phase C — after all above)
Track 9: Cleanup (P3 items)
```

## Track Summary

| Track | Fixes | Severity | Files Touched | Est. Effort |
|-------|-------|----------|---------------|-------------|
| [[fix-track-p0-secrets]] | #1 Secrets in repo | P0 | 3 | 1 hour |
| [[fix-track-p0-rls]] | #2 RLS bypass | P0 | 46 routes | 4 hours |
| [[fix-track-p1-auth]] | #3 Admin auth patterns | P1 | 29 routes | 2 hours |
| [[fix-track-p1-csrf]] | #4 Missing CSRF | P1 | 50+ routes | 3 hours |
| [[fix-track-p1-bundle]] | #5 Sentry in client | P1 | 1 + 5 consumers | 1 hour |
| [[fix-track-p1-ratelimit]] | #6 Missing rate limits | P1 | 53 routes | 2 hours |
| [[fix-track-p2-components]] | #7 God components | P2 | 3 files → 15+ | 6 hours |
| [[fix-track-p2-cart]] | #8 Cart no caching | P2 | 1 → 3 files | 4 hours |
| [[fix-track-p2-duplication]] | #9 Duplicate modules | P2 | 14 files → 7 | 3 hours |
| [[fix-track-p2-tests]] | #10-11 Test coverage + env | P2 | 20+ new files | 8 hours |
| [[fix-track-p3-cleanup]] | #12-15 Low items | P3 | 8 files | 2 hours |

**Total estimated effort: ~34 hours**

## Phase A — Critical & High (Do First)

### [[fix-track-p0-secrets]] — Rotate & Remove Secrets

1. Add `.env.local` to `.gitignore`
2. Remove `.env.local` from git history (`git filter-branch` or BFG)
3. Rotate ALL exposed secrets: Supabase service key, Clerk secret, Cashfree key, Upstash token, Resend key
4. Set secrets in Vercel Env Variables
5. Verify `.env.example` is the only env file in repo

### [[fix-track-p0-rls]] — Enforce RLS on User Routes

1. Audit all 46 routes using `createAdminClient`
2. Categorize: admin-only (keep admin) vs user-facing (switch to user client)
3. Replace `createAdminClient` → `createClient` in user-facing routes
4. Add user-scoped `WHERE` clauses (e.g., `.eq('user_id', userId)`)
5. Test each route with non-admin user

### [[fix-track-p1-auth]] — Standardize Admin Auth

1. Import `requireAdmin()` from `@/lib/auth/verify-jwt` in all 29 admin routes
2. Remove inline auth checks and manual `auth()` calls
3. Delete the inline `requireAdmin` in `app/api/admin/stories/route.ts`
4. Verify middleware still provides first line of defense

### [[fix-track-p1-csrf]] — Add CSRF to All Mutations

1. Read CSRF token from cookie in all POST/PUT/PATCH/DELETE handlers
2. Validate against `X-CSRF-Token` header
3. Apply `validateCsrf()` from `@/lib/csrf-server.ts`
4. Delete unused `@/lib/csrf.ts`
5. Test: verify mutations fail without CSRF token

## Phase B — Medium & Structural

### [[fix-track-p1-bundle]] — Split Logger

1. Create `lib/logger-client.ts` with dynamic Sentry import
2. Create `lib/logger-server.ts` with static Sentry import
3. Update all 60 consumer files to import from correct variant
4. Delete original `lib/logger.ts` (or re-export with deprecation)

### [[fix-track-p1-ratelimit]] — Expand Rate Limiting

1. Define rate limit tiers: auth (5/min), mutation (20/min), read (60/min)
2. Apply `applyRateLimit` to all missing routes by tier
3. Add `@upstash/ratelimit` to webhook routes (with higher limit)
4. Document limits in `docs/api/rate-limit.md`

### [[fix-track-p2-components]] — Decompose God Components

1. [[AdminProductForm]] → `ProductBasicInfo`, `VariantManager`, `MediaUploader`, `CategoryPicker`
2. [[Checkout]] → `ShippingForm`, `CourierSelector`, `OrderSummary`, `PaymentIntegration`
3. [[ProductDetail]] → `ProductHero`, `VariantSelector`, `ReviewSection`, `ShareActions`
4. Extract shared hooks: `useProductForm`, `useCheckoutFlow`, `useProductView`

### [[fix-track-p2-cart]] — Refactor CartContext

1. Replace `useState` + `fetch()` with TanStack Query mutations
2. Add optimistic updates for add/remove/update cart items
3. Add `useCart` hook backed by `useQuery` for reads
4. Keep `CartContext` as thin provider over TanStack Query cache
5. Add cart persistence via Supabase sync

### [[fix-track-p2-duplication]] — Consolidate Duplicates

1. `auditLog.ts` → delete (412 lines), keep `audit-log.ts` (52 lines), migrate 1 consumer
2. `csrf.ts` → delete (0 imports), keep `csrf-server.ts`
3. `payment.ts` + `payment-secure.ts` → delete both (0 imports each), create single `payment.ts`
4. `cashfree.ts` + `cashfree-server.ts` → merge into `cashfree-server.ts`, keep `cashfree-sdk.ts` as client
5. `TrustBadges`, `ProductReviews`, `ProductGallery` → keep `components/products/` variants, delete root

### [[fix-track-p2-tests]] — Core Test Coverage

1. Payment flow integration test (checkout → create order → webhook → confirm)
2. Auth middleware test (protected routes, admin routes, auth redirects)
3. Cart logic unit test (add, remove, merge, quantity update)
4. API validation test (Zod schemas, sanitization, CSRF)
5. Replace `NEXT_PUBLIC_CLOUDINARY_API_KEY` server fallback with `CLOUDINARY_API_KEY`

## Phase C — Polish

### [[fix-track-p3-cleanup]] — Low-Priority Cleanup

1. Remove redundant `AuthProvider` — use Clerk hooks directly
2. Increase `staleTime` from 30s to 5min in providers
3. Extract `cashfree-mcp/` as workspace or separate repo
4. Clean stale worktrees: `rm -rf .claude/worktrees/agent-* .git/worktrees/copilot-*`
5. Remove `semantic-ui-react` from cashfree-mcp

## Verification Checklist

After all tracks complete:

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No secrets in git history (`git log --all --full-history -- "*.env*"`)
- [ ] Non-admin user cannot access another user's cart/orders
- [ ] CSRF token required on all mutations
- [ ] Rate limiting returns 429 on abuse
- [ ] Client bundle does not include Sentry
- [ ] All duplicate files removed
- [ ] Core test suite passes

## Where This Fits

- [[project-audit-2026-04]] — source of all findings
- [[supabase-server-ts]] — Track 2 RLS fix target
- [[middleware-ts]] — Tracks 3+4 auth/CSRF target
- [[cart-context]] — Track 8 refactor target
- [[api-routes]] — Tracks 2-6 route-level fixes
- [[duplication-hotspots]] — Track 9 consolidation
- [[security-posture]] — Tracks 1-4 security hardening
- [[state-management-patterns]] — Track 8 cart refactor