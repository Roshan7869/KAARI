# Phase 7: SEO & Legal Compliance — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Technical SEO
| Metric | Target | Tool |
|--------|--------|------|
| robots.txt exists and is valid | ✅ | Google Search Console |
| sitemap.xml accessible | ✅ at `/sitemap.xml` | Browser / GSC |
| Sitemap includes all products | 100% of active products | Code audit |
| Canonical URLs on all pages | 100% | Screaming Frog |
| Open Graph tags | Title, description, image on all pages | og:checker |
| Twitter Card tags | Summary_large_image on all pages | Twitter validator |
| JSON-LD structured data | Product, BreadcrumbList, Organization | Google Rich Results Test |
| Meta description length | 140–160 characters | SEO audit tool |
| Title tag length | 50–60 characters | SEO audit tool |
| No duplicate meta descriptions | 0 duplicates | Screaming Frog |

### JSON-LD Schema Types Required
| Page Type | Schema | Standard |
|-----------|--------|----------|
| Product page | `Product` (with `offers`, `aggregateRating`) | Schema.org |
| Home page | `Organization`, `WebSite` | Schema.org |
| Category page | `BreadcrumbList` | Schema.org |
| All pages | `BreadcrumbList` | Schema.org |

### Legal Compliance
| Requirement | Target | Standard |
|-------------|--------|----------|
| Privacy Policy page | ✅ GDPR-compliant | GDPR / IT IT Rules 2011 |
| Terms of Service page | ✅ | Legal requirement |
| Refund Policy page | ✅ | Consumer Protection Act |
| Shipping Policy page | ✅ | E-commerce standard |
| Cancellation Policy page | ✅ | Consumer Protection Act |
| Cookie consent banner | ✅ GDPR-compliant | GDPR Article 7 |
| Cookie consent stored | ✅ in localStorage/cookie | GDPR |
| Footer links to all policies | ✅ | Industry standard |

---

## Phase 7 Audit Checklist

- [ ] `curl https://yourdomain.com/robots.txt` → valid, blocks `/api/*`, allows `/`
- [ ] `curl https://yourdomain.com/sitemap.xml` → valid XML, lists product URLs
- [ ] Google Rich Results Test on product page → no errors
- [ ] All 5 policy pages render at their routes
- [ ] Cookie banner appears on first visit, does not re-appear after consent
- [ ] Lighthouse SEO score ≥ 90
- [ ] OG image renders correctly on social share preview

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 7: SEO & LEGAL COMPLIANCE
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Implement complete SEO infrastructure and legal compliance pages for the Next.js e-commerce platform.

RULES:
1. robots.txt must ALLOW all product/category pages, DISALLOW /api/*, /admin/*, /dashboard/*.
2. sitemap.ts must query the DB for all active products and categories — regenerate dynamically.
3. Every page must export a `generateMetadata` function — no page without metadata.
4. JSON-LD for Product pages must include: name, description, image, price, currency, availability, aggregateRating.
5. All policy pages (P7.5–P7.9) must have full legal text — use industry-standard templates, customize for Indian e-commerce law (Consumer Protection Act 2019, IT Act 2000).
6. Cookie consent banner must: appear on first visit, store consent in `cookie-consent` cookie, not re-appear after consent.
7. OG image must be 1200×630px, generated via Next.js OG image generation.
8. All meta descriptions must be 140–160 characters — not shorter, not longer.
9. Footer must link to all 5 policy pages and appear on every page.
10. After all P7.x tasks, run the audit checklist — confirm Google Rich Results Test passes.

START: Execute P7.1 now. Continue through P7.11 without stopping.
```
