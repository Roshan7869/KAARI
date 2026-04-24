---
type: concept
title: "Fix Track P2 — Decompose God Components"
tags: [fix-plan, medium, architecture, refactoring]
sources:
  - wiki/synthesis/project-audit-2026-04
  - wiki/synthesis/fix-plan-master
created: 2026-04-23
updated: 2026-04-23
---

# Fix Track P2 — Decompose God Components

## Problem

Three components exceed 800 lines and manage 10+ state variables each. This makes them hard to test, debug, and maintain.

## Component Breakdown

### 1. `AdminProductForm.tsx` (1285 lines, 14 useState, 3 useEffect)

**Current responsibilities**: Product creation, editing, variant management, media upload, category assignment, form validation.

**Decompose into**:
| New Component | Responsibility | Lines (est.) |
|----------------|---------------|-------------|
| `ProductBasicInfo.tsx` | Name, slug, description, price fields | ~150 |
| `VariantManager.tsx` | Add/edit/delete variants with SKU, stock, pricing | ~200 |
| `MediaUploader.tsx` | Image upload, drag-to-reorder, delete, primary selection | ~180 |
| `CategoryPicker.tsx` | Category selection with search | ~80 |
| `ProductForm.tsx` | Orchestrator, composes above components | ~120 |

**Extracted hook**: `useProductForm()` — form state, validation, submit logic

### 2. `Checkout.tsx` (920 lines, 20 useState, 5 useEffect)

**Current responsibilities**: Address form, courier selection, order summary, payment integration, CSRF token, submission.

**Decompose into**:
| New Component | Responsibility | Lines (est.) |
|----------------|---------------|-------------|
| `ShippingForm.tsx` | Address entry with validation | ~200 |
| `CourierSelector.tsx` | Shipping method selection | ~100 |
| `OrderSummary.tsx` | Cart items, totals, coupon | ~120 |
| `PaymentSection.tsx` | Payment method UI, Cashfree integration | ~150 |
| `Checkout.tsx` | Orchestrator, composes above | ~100 |

**Extracted hook**: `useCheckoutFlow()` — checkout state machine, API calls

### 3. `ProductDetail.tsx` (833 lines, 11 useState)

**Current responsibilities**: Product display, variant selection, image gallery, reviews, share, WhatsApp.

**Decompose into**:
| New Component | Responsibility | Lines (est.) |
|----------------|---------------|-------------|
| `ProductHero.tsx` | Main image, title, price | ~120 |
| `VariantSelector.tsx` | Size/color selection, stock indicator | ~150 |
| `ProductGallery.tsx` | Image carousel with zoom | ~180 |
| `ReviewSection.tsx` | Reviews list, write review, ratings | ~200 |
| `ShareActions.tsx` | Share + WhatsApp button | ~50 |
| `ProductDetail.tsx` | Orchestrator, composes above | ~80 |

**Extracted hook**: `useProductView()` — product data fetching, variant selection

## Steps

1. Start with `ProductDetail.tsx` (simplest split, fewest interdependencies)
2. Then `AdminProductForm.tsx` (most state, needs careful extraction)
3. Then `Checkout.tsx` (most complex, has payment integration)
4. For each: extract hook first, then split components, then verify

## Verification

- [ ] Each component < 250 lines
- [ ] Each component has ≤ 5 `useState` calls
- [ ] All extracted hooks have unit tests
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Manual test: product detail, checkout, admin product form all work

## Links

- [[fix-plan-master]] — master plan
- [[state-management-patterns]] — state management context