---
type: concept
title: "Fix Track P2 — Consolidate Duplicate Modules"
tags: [fix-plan, medium, code-quality, duplication]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
  - wiki/concepts/duplication-hotspots
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P2 — Consolidate Duplicate Modules

## Problem

7 pairs of duplicate modules exist in the codebase, creating confusion about which to use and risking divergent behavior.

## Duplication Map

### 1. Audit Logging: `auditLog.ts` vs `audit-log.ts`

| File | Lines | Import Method | Consumers |
|------|-------|---------------|-----------|
| `lib/auditLog.ts` | 412 | `import { logAudit } from '@/lib/auditLog'` | 1 file |
| `lib/audit-log.ts` | 52 | `import { logAudit } from '@/lib/audit-log'` | 0 files |

**Fix**: Delete `lib/audit-log.ts` (0 imports). Keep `lib/auditLog.ts`. Rename to `lib/audit-log.ts` for consistency and update the 1 consumer.

### 2. CSRF: `csrf.ts` vs `csrf-server.ts`

| File | Lines | Consumers |
|------|-------|-----------|
| `lib/csrf.ts` | 142 | 0 |
| `lib/csrf-server.ts` | 57 | 3 |

**Fix**: Delete `lib/csrf.ts`. Keep `lib/csrf-server.ts`.

### 3. Payment: `payment.ts` vs `payment-secure.ts`

| File | Lines | Consumers |
|------|-------|-----------|
| `lib/payment.ts` | 312 | 0 |
| `lib/payment-secure.ts` | 350 | 0 |

**Fix**: Review both. If neither is imported, delete both. If needed, merge useful parts into a single `lib/payment.ts`.

### 4. Cashfree: `cashfree.ts` + `cashfree-server.ts` + `cashfree-sdk.ts`

| File | Lines | `'server-only'` | Consumers | Notes |
|------|-------|-----------------|-----------|-------|
| `lib/cashfree.ts` | 483 | Yes | API routes | Has `getCashfreeBaseUrl()` |
| `lib/cashfree-server.ts` | 183 | Yes | API routes | Has duplicate `getCashfreeBaseUrl()` |
| `lib/cashfree-sdk.ts` | 407 | No | Client components | Client-side SDK |

**Fix**: Merge `cashfree.ts` + `cashfree-server.ts` into `lib/cashfree-server.ts`. Remove duplicate `getCashfreeBaseUrl()`. Keep `cashfree-sdk.ts` as client module.

### 5-7. Component Duplicates

| Root Component | Products Component | Consumers |
|----------------|-------------------|-----------|
| `components/TrustBadges.tsx` | `components/products/TrustBadges.tsx` | Check imports |
| `components/ProductReviews.tsx` | `components/products/ProductReviews.tsx` | Check imports |
| `components/ProductGallery.tsx` | `components/products/ProductGallery.tsx` | Check imports |

**Fix**: Keep `components/products/*` variants (correct location). Delete root-level duplicates. Update any imports.

### 8. Context Duplicates

| File | Location | Consumers |
|------|----------|-----------|
| `AuthContext.tsx` | `contexts/` + `app/contexts/` | Check imports |
| `CartContext.tsx` | `contexts/` + `app/contexts/` | Check imports |

**Fix**: Keep `contexts/` (canonical). Delete `app/contexts/`. Update imports.

### 9. ProtectedRoute Duplicates

| File | Location |
|------|----------|
| `ProtectedRoute.tsx` | `app/components/` + `components/` |

**Fix**: Keep `components/ProtectedRoute.tsx`. Delete `app/components/ProtectedRoute.tsx`. Update imports.

## Steps

1. **Audit imports** for each duplicate using `grep -r "from.*module" app/ components/`
2. **Keep** the better/newer version of each pair
3. **Migrate** any consumers to the kept version
4. **Delete** the unused version
5. **Run** `npm run type-check` and `npm run lint`
6. **Verify** no broken imports

## Links

- [[fix-plan-master]] — master plan
- [[duplication-hotspots]] — detailed duplication analysis