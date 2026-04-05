# Phase 5: Email System — Performance Metrics & Autopilot Prompt

## Industry-Standard Pass Criteria

### Deliverability
| Metric | Target | Standard |
|--------|--------|----------|
| SPF record configured | ✅ | Email RFC |
| DKIM signing enabled | ✅ | Email RFC |
| DMARC policy set | ✅ | Email RFC |
| Bounce rate | < 2% | Resend / industry |
| Spam complaint rate | < 0.1% | Google Postmaster Tools |

### Performance
| Metric | Target | Measurement |
|--------|--------|-------------|
| Email dispatch (non-blocking) | Does NOT block HTTP response | Code audit + response time test |
| Email queue time (fire-and-forget) | < 100ms added to response | Benchmark |
| Email delivery time (Resend) | < 30 seconds end-to-end | Resend dashboard |
| Email template render time | < 10ms | Benchmark `renderAsync` |

### Reliability
| Metric | Target |
|--------|--------|
| Failed email → logged (not thrown) | 100% (no unhandled rejections) |
| Retry on transient failure | ✅ (via Resend built-in) |
| Email sends on all 6 trigger events | 100% verified |
| No duplicate emails on retry | ✅ (idempotency) |

### Email Templates
| Template | Required Fields | Verified |
|----------|----------------|---------|
| Order confirmation | Order ID, items, total, tracking | ✅ |
| Shipping update | Tracking number, carrier, ETA | ✅ |
| Welcome email | User name, login link | ✅ |
| Password reset | Reset link (expires 1hr) | ✅ |
| Admin new order | Order summary, admin link | ✅ |

---

## Phase 5 Audit Checklist

- [ ] Send test email → received in inbox (not spam) within 30s
- [ ] `POST /api/orders` → order confirmation email triggered (check Resend dashboard)
- [ ] Resend client is singleton (not re-instantiated per request)
- [ ] Email dispatch does NOT block API response — verify with response time test
- [ ] Failed email send → error logged, HTTP response still 200
- [ ] Password reset link expires after 1 hour

---

## Autopilot Prompt

```
AUTOPILOT MODE — PHASE 5: EMAIL SYSTEM
PERMISSIONS: ALL FILE OPERATIONS ALLOWED. NO HUMAN APPROVAL NEEDED. EXECUTE ALL TASKS AUTONOMOUSLY.

Build a complete non-blocking email system using Resend for a Next.js e-commerce platform.

RULES:
1. Resend client must be a singleton — create once in lib/email/client.ts, import everywhere.
2. ALL email sends must be non-blocking — use `.catch(logger.error)` pattern, never `await` in the main request path.
3. Password reset tokens must expire in exactly 1 hour — store expiry in DB, verify on use.
4. Email templates must use React Email components (not raw HTML strings).
5. Every email template must have plaintext fallback.
6. Failed email dispatch must be caught and logged via pino — never throw, never crash the API.
7. All 6 email types must be triggered by their corresponding events in the relevant API routes.
8. Use environment variable RESEND_API_KEY — never hardcode.
9. Admin notification email goes to process.env.ADMIN_EMAIL.
10. After all P5.x tasks, run the audit checklist above — confirm all pass.

START: Execute P5.1 now. Continue through P5.7 without stopping.
```
