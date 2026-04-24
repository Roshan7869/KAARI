---
type: concept
title: "Duplication Hotspots — Module Pairs"
tags: [code-quality, duplication, architecture]
sources:
  - wiki/synthesis/project-audit-2026-04
created: 2026-04-23
updated: 2026-04-23
---

# Duplication Hotspots

7+ pairs of duplicate modules exist. Each pair creates confusion about which to import and risks divergent behavior.

## Duplicate Modules

| Module A | Lines | Module B | Lines | Keep |
|----------|-------|----------|-------|------|
| `lib/auditLog.ts` | 412 | `lib/audit-log.ts` | 52 | auditLog (1 consumer) |
| `lib/csrf.ts` | 142 | `lib/csrf-server.ts` | 57 | csrf-server (3 consumers) |
| `lib/payment.ts` | 312 | `lib/payment-secure.ts` | 350 | Neither (0 imports) — delete both |
| `lib/cashfree.ts` | 483 | `lib/cashfree-server.ts` | 183 | Merge into cashfree-server |
| `lib/cloudinary.ts` | — | `lib/cloudinary-server.ts` | — | Verify split is intentional |

## Duplicate Components

| Root Component | Products Variant | Action |
|----------------|-----------------|--------|
| `components/TrustBadges.tsx` | `components/products/TrustBadges.tsx` | Delete root |
| `components/ProductReviews.tsx` | `components/products/ProductReviews.tsx` | Delete root |
| `components/ProductGallery.tsx` | `components/products/ProductGallery.tsx` | Delete root |

## Duplicate Contexts

| File | Location A | Location B |
|------|-----------|-----------|
| `AuthContext.tsx` | `contexts/` | `app/contexts/` |
| `CartContext.tsx` | `contexts/` | `app/contexts/` |

## Duplicate Route Guards

| File | Location A | Location B |
|------|-----------|-----------|
| `ProtectedRoute.tsx` | `components/` | `app/components/` |

## Root Cause

Likely caused by file moves without cleanup. `app/contexts/` and `app/components/` appear to be pre-move remnants.

## Links

- [[fix-track-p2-duplication]] — consolidation plan
- [[fix-plan-master]] — master plan