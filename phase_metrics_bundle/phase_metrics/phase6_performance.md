# Phase 6: Performance Optimization — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria (2026 Standards)

### Core Web Vitals (Must Pass — Google Ranking Factor)
| Metric | Good | Needs Improvement | Poor | Tool |
|--------|------|-------------------|------|------|
| LCP (Largest Contentful Paint) | < 2.0s | 2.0–4.0s | > 4.0s | PageSpeed Insights |
| INP (Interaction to Next Paint) | < 150ms | 150–500ms | > 500ms | PageSpeed Insights |
| CLS (Cumulative Layout Shift) | < 0.08 | 0.08–0.25 | > 0.25 | PageSpeed Insights |
| FCP (First Contentful Paint) | < 1.5s | 1.5–3.0s | > 3.0s | PageSpeed Insights |
| TTFB (Time to First Byte) | < 600ms | 600ms–1.8s | > 1.8s | PageSpeed Insights |

### Lighthouse Scores (Minimum for Production)
| Category | Minimum | Target |
|----------|---------|--------|
| Performance | ≥ 85 | ≥ 90 |
| Accessibility | ≥ 90 | ≥ 95 |
| Best Practices | ≥ 90 | ≥ 95 |
| SEO | ≥ 90 | ≥ 95 |

### Caching
| Metric | Target | Tool |
|--------|--------|------|
| Redis cache hit rate (product pages) | > 80% | Redis INFO |
| ISR revalidation interval (product pages) | 60s–300s | next.config.js |
| Static asset cache-control | `max-age=31536000, immutable` | curl headers |
| API cache headers on public endpoints | `s-maxage=60, stale-while-revalidate=300` | curl headers |

### Bundle Size
| Metric | Target |
|--------|--------|
| First Load JS (home page) | < 150 KB |
| First Load JS (product page) | < 180 KB |
| Total page weight (images + JS + CSS) | < 1 MB |
| Images — WebP/AVIF format | 100% via next/image |
| Font display | `font-display: swap` on all fonts |

### Database Query Performance
| Metric | Target |
|--------|--------|
| Product listing query (p99) | < 20ms |
| Product detail query (p99) | < 10ms |
| Order history query (p99) | < 30ms |
| Slow query log threshold | 100ms |

---

## Phase 6 Audit Checklist

- [ ] `npx lighthouse <url> --output json` → Performance ≥ 85
- [ ] PageSpeed Insights → LCP < 2.0s, INP < 150ms, CLS < 0.08
- [ ] `curl -I <product-url>` → `cache-control: s-maxage=60` present
- [ ] Redis CLI `INFO stats` → `keyspace_hits / (keyspace_hits + keyspace_misses)` > 0.8
- [ ] `next build` → First Load JS < 150 KB for home page
- [ ] Zero images served as JPEG/PNG (all via next/image → WebP)

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 6: PERFORMANCE OPTIMIZATION
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Optimize the Next.js e-commerce platform to meet 2026 Core Web Vitals standards and production performance benchmarks.

RULES:
1. ISR must be configured on ALL product and category pages — use `revalidate: 60` minimum.
2. Redis cache key pattern: `product:{id}`, `products:list:{page}:{filters}` — TTL 300s.
3. All HTTP cache headers must be set explicitly in route handlers — never rely on defaults.
4. Code-split ANY component > 50 KB using `dynamic(() => import(...), { loading: () => <Skeleton /> })`.
5. ALL fonts must use `next/font` with `display: 'swap'` — no external font CDN links.
6. Images must use `next/image` with explicit `width`, `height`, and `priority` on above-fold images.
7. Database queries must use the indexes created in Phase 2 — run EXPLAIN ANALYZE to verify.
8. Loading skeletons must match the exact layout of the content they replace (no layout shift).
9. Never cache authenticated/user-specific data in Redis with shared keys.
10. After all P6.x tasks, run Lighthouse audit — confirm Performance score ≥ 85 and all CWV green.

START: Execute P6.1 now. Continue through P6.7 without stopping.
```
