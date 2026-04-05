# Phase 3: Feature Implementation — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Auth Module
| Metric | Target | Standard |
|--------|--------|----------|
| JWT expiry | Access: 15min, Refresh: 7 days | OWASP |
| Password hashing cost factor | bcrypt rounds ≥ 12 | OWASP |
| OAuth callback state validation | CSRF token verified | OAuth 2.0 RFC |
| Rate limit on login | ≤ 5 attempts / 15 min | OWASP Brute Force |
| `/api/auth/me` latency | < 50ms (p99) | Industry standard |

### Products API
| Metric | Target | Tool |
|--------|--------|------|
| Product list response time | < 100ms (p99, cached) | API benchmark |
| Product detail response time | < 50ms (p99, cached) | API benchmark |
| Cache hit rate (Redis) | > 80% | Redis `INFO stats` |
| Pagination support | Cursor or offset-based | API contract |
| Image URL validation | 100% valid URLs | Zod schema |

### Cart Module
| Metric | Target |
|--------|--------|
| Cart GET latency | < 30ms (p99) |
| Cart POST/PUT/DELETE latency | < 50ms (p99) |
| Cart persists across sessions | ✅ (DB-backed) |
| Cart merged on login | ✅ (guest → auth) |
| Stock validation on add-to-cart | ✅ |

### Checkout & Orders
| Metric | Target | Standard |
|--------|--------|----------|
| Payment webhook HMAC verified | 100% of webhooks | PCI DSS |
| Order status transitions | Valid state machine | No invalid states |
| Idempotent order creation | Duplicate prevention via idempotency key | Industry standard |
| Checkout latency (p99) | < 500ms | Industry standard |

### API General
| Metric | Target | Tool |
|--------|--------|------|
| All endpoints validated with Zod | 100% | Code audit |
| HTTP status codes correct | 200/201/400/401/403/404/500 used correctly | API tests |
| Error responses follow RFC 7807 | All errors structured | Code audit |
| API response gzip | Enabled | curl -H "Accept-Encoding: gzip" |

---

## Phase 3 Audit Checklist

- [ ] `POST /api/auth/login` with wrong password → 401, not 500
- [ ] `POST /api/auth/login` 6 times → 429 on 6th
- [ ] `GET /api/products` → < 100ms (check Redis cache on 2nd call)
- [ ] `POST /api/orders` duplicate idempotency key → same order returned, not duplicate
- [ ] Webhook with invalid HMAC → 400 rejected
- [ ] All Zod schemas reject malformed input with 400

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 3: FEATURE IMPLEMENTATION
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Build the full feature layer (auth, products, cart, checkout, orders, reviews, admin) for a Next.js e-commerce platform. All API routes must be production-grade, not prototypes.

RULES:
1. Every API route must use Zod for request body validation — reject malformed input with HTTP 400.
2. JWT access tokens expire in 15 minutes; refresh tokens expire in 7 days.
3. bcrypt rounds must be exactly 12 — not less.
4. All product/category reads must check Redis cache first, fallback to DB, then populate cache.
5. Cart must support guest sessions (cookie-based) that merge with user cart on login.
6. Orders must use an idempotency key to prevent double-processing.
7. Payment webhooks must verify HMAC signature before any processing — reject with 400 on failure.
8. All error responses must follow the structure: `{ error: string, code: string, details?: any }`.
9. Admin endpoints must check for admin role in JWT claims — return 403 if not admin.
10. After all P3.x tasks, run the full audit checklist — confirm all pass.

START: Execute P3.1 now. Continue through P3.7 without stopping.
```
