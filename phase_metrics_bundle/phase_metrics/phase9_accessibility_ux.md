# Phase 9: Accessibility & UX — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### WCAG 2.1 AA Compliance (Legal Requirement in many jurisdictions)
| Criterion | Target | Tool |
|-----------|--------|------|
| Color contrast ratio (text) | ≥ 4.5:1 (normal), ≥ 3:1 (large) | axe / WAVE |
| All interactive elements keyboard-accessible | 100% | Manual test |
| Focus indicator visible | 100% of focusable elements | Manual test |
| All images have alt text | 100% | axe |
| All form inputs have labels | 100% | axe |
| ARIA roles on custom components | Correct roles, no invalid ARIA | axe |
| Axe automated violations | 0 critical, 0 serious | axe-core |
| Screen reader announcement on route change | ✅ | Manual test |

### Lighthouse Accessibility Score
| Score | Status |
|-------|--------|
| ≥ 95 | ✅ Pass |
| 90–94 | ⚠️ Acceptable |
| < 90 | ❌ Fail |

### Responsive Design
| Breakpoint | Target | Test Tool |
|------------|--------|-----------|
| 320px (minimum mobile) | Fully functional, no overflow | Chrome DevTools |
| 375px (iPhone SE) | Fully functional | Chrome DevTools |
| 768px (tablet) | Fully functional | Chrome DevTools |
| 1280px (desktop) | Fully functional | Chrome DevTools |
| Horizontal scroll | 0 (no unintended scroll) | Chrome DevTools |

### UX Completeness
| Feature | Target |
|---------|--------|
| Loading skeleton on every async component | ✅ |
| Error state on every async component | ✅ |
| Empty state with CTA on list pages | ✅ |
| Toast notifications (success/error/info) | ✅ |
| Form validation feedback inline | ✅ (not alert()) |
| Page transition feedback | ✅ |
| 404 page with navigation | ✅ |
| 500 error page | ✅ |

---

## Phase 9 Audit Checklist

- [ ] `npx axe <url>` → 0 critical, 0 serious violations
- [ ] Lighthouse Accessibility score ≥ 95
- [ ] Tab through entire checkout flow — every element reachable, focus visible
- [ ] Test at 320px viewport — no horizontal overflow
- [ ] Every form field has associated `<label>` (check with axe)
- [ ] Loading state visible on product list (slow 3G simulation)
- [ ] Empty cart page shows CTA to browse products

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 9: ACCESSIBILITY & UX
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Implement full WCAG 2.1 AA accessibility compliance and UX polish for the Next.js e-commerce platform.

RULES:
1. Every button without visible text must have `aria-label` — audit ALL buttons.
2. Every form input must have an associated `<label htmlFor="...">` — no placeholder-only labels.
3. Focus indicators must be visible (outline: 2px solid #focus-color) — never `outline: none` without custom replacement.
4. All custom interactive components (dropdowns, modals, accordions) must use correct ARIA roles and keyboard event handlers.
5. Color contrast: run contrast check on every text/background color combination — fix anything below 4.5:1.
6. Every async data-fetching component needs 3 states: loading (skeleton), error (retry button), success (content).
7. Every list page needs an empty state component with clear CTA.
8. Toast system must support: success (green), error (red), warning (yellow), info (blue) — auto-dismiss after 5s.
9. Mobile: test every interactive element at 320px — minimum tap target size 44×44px.
10. After all P9.x tasks, run axe audit — confirm 0 critical and 0 serious violations, Lighthouse Accessibility ≥ 95.

START: Execute P9.1 now. Continue through P9.7 without stopping.
```
