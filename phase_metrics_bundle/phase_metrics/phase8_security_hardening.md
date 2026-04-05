# Phase 8: Security Hardening — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Security Headers (OWASP Recommended)
| Header | Required Value | Verification |
|--------|---------------|--------------|
| `Content-Security-Policy` | Strict policy, no `unsafe-eval` | securityheaders.com |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | curl -I |
| `X-Content-Type-Options` | `nosniff` | curl -I |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | curl -I |
| `Permissions-Policy` | Disable unused APIs | curl -I |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | curl -I |
| SecurityHeaders.com Score | A or A+ | securityheaders.com |

### Authentication Security
| Metric | Target | Standard |
|--------|--------|----------|
| Brute force protection | ≤ 5 attempts / 15 min | OWASP |
| Password minimum length | ≥ 8 characters | NIST SP 800-63B |
| Password hashing | bcrypt rounds ≥ 12 | OWASP |
| JWT secret strength | ≥ 256-bit entropy | RFC 7519 |
| Refresh token rotation | ✅ on every use | OWASP |
| Admin routes — role check | 100% verified | Code audit |

### Input Validation & Injection Prevention
| Metric | Target | Tool |
|--------|--------|------|
| All user inputs Zod-validated | 100% | Code audit |
| All DB queries parameterized | 100% (0 string concatenation) | Code audit |
| XSS via DOMPurify | All user-rendered HTML sanitized | Code audit |
| SQL injection vectors | 0 | Automated scan |
| SSRF vectors | 0 | Code audit |

### Secrets & Environment
| Metric | Target |
|--------|--------|
| Zero secrets in client bundle | 0 `NEXT_PUBLIC_` secrets | Code audit |
| Zero secrets committed to git | 0 | `git-secrets` / trufflehog |
| `.env.example` documents all vars | ✅ | File audit |
| Webhook HMAC verified | 100% of webhook handlers | Code audit |

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 requests | 15 min |
| `/api/auth/signup` | 10 requests | 1 hour |
| `/api/` general | 100 requests | 1 min |
| `/api/admin/` | 30 requests | 1 min |

---

## Phase 8 Audit Checklist

- [ ] `curl -I https://yourdomain.com` → all 6 security headers present
- [ ] securityheaders.com scan → A or A+ rating
- [ ] `POST /api/auth/login` 6× → 429 on 6th request
- [ ] `GET /api/admin/stats` without token → 401
- [ ] `GET /api/admin/stats` with user token (non-admin) → 403
- [ ] `grep -r "NEXT_PUBLIC_" .env*` → no secret keys exposed
- [ ] `git log --all --full-history -- .env` → no .env files in git history
- [ ] Webhook with wrong HMAC → 400, no processing

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 8: SECURITY HARDENING
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Harden the security of the Next.js e-commerce platform to OWASP and PCI DSS standards.

RULES:
1. All 6 security headers must be set in next.config.js headers() function — test with curl after.
2. CSP must be strict: no `unsafe-eval`, no `unsafe-inline` for scripts — use nonces for inline scripts if needed.
3. Every admin route must check `user.role === 'admin'` from JWT claims — return 403 immediately if not.
4. Rate limiting must use Redis-backed sliding window — implement in middleware.ts.
5. DOMPurify sanitization must wrap ALL user-generated content before rendering — no exceptions.
6. Audit every `.env*` file — any key not prefixed `NEXT_PUBLIC_` must NEVER appear in client code.
7. All webhook handlers must verify HMAC before ANY business logic runs.
8. All DB queries: grep for string concatenation in SQL — replace every instance with parameterized queries.
9. Refresh tokens must be invalidated on logout — delete from DB.
10. After all P8.x tasks, run the full audit checklist — confirm securityheaders.com score is A or A+.

START: Execute P8.1 now. Continue through P8.7 without stopping.
```
