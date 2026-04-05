# Kaari Marketplace — Audit Suite

## Two scripts, full coverage

| Script | What it tests | Needs browser? |
|---|---|---|
| `kaari.audit.ts` | Auth, Products, Cart, Checkout, Payments, Customisation, Admin, Security | Yes (Playwright) |
| `kaari.db-check.ts` | Schema, RLS, RPCs, data quality, payment stats | No (Supabase SDK only) |

---

## Quick start

```bash
cd kaari-audit
npm install
npx playwright install chromium

# Set environment
export KAARI_BASE_URL=http://localhost:8080
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_SERVICE_KEY=service_role_xxxxx
export AUDIT_USER_EMAIL=test.user@kaari.in
export AUDIT_USER_PASS=Audit@2024!
export AUDIT_ADMIN_EMAIL=admin@kaari.in
export AUDIT_ADMIN_PASS=Admin@2024!

# Run DB check alone (no browser needed)
npm run db-check

# Run full E2E audit
npm run audit

# Run both
npm run all
```

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks pass (or only non-critical failures) |
| `1` | One or more CRITICAL failures |
| `2` | Audit runner itself crashed |

Integrate into CI: `npm run all && echo "Kaari audit passed"` — fails the pipeline on CRITICAL issues.

---

## What's checked (62 checks total)

### Auth & Session (8)
- Login/signup pages load
- Invalid credentials show error feedback
- Valid user login → redirect
- Auth token stored in localStorage
- Authenticated access to /checkout
- Unauthenticated /checkout → /login redirect
- Admin login works
- Non-admin blocked from /admin

### Product Catalogue (7)
- Homepage, /products listing load
- Product cards show INR prices
- Product detail via slug
- Add to Cart button present
- Stock status visible
- Out-of-stock disables Add to Cart

### Cart (7)
- /cart loads
- Add from listing
- Cart count in nav
- Cart persists across reload (Supabase sync)
- Quantity increase works
- Quantity blocked at stock_qty (CRITICAL)
- Item removal works

### Checkout & Payments (9)
- /checkout loads with auth
- INR order summary shown
- Address validation before submit
- COD option present
- `create_order_from_cart` RPC fires (network intercept)
- /dummy-payment accessible
- /order-confirmation reachable
- Payment session in storage
- Webhook endpoint responds

### Product Customisation (5)
- Customisation form visible
- Message/size/color/material fields
- File upload input
- Budget field accepts input
- Delivery deadline field

### Admin Panel (6)
- /admin loads for admin
- Dashboard stats visible
- Inventory list renders
- Inline price edit works
- Add product flow accessible
- Orders visible

### Database Integrity (16 — Supabase only)
- All 12 core tables exist
- Column presence (slug, stock_qty, price, etc.)
- RPCs: create_order_from_cart, has_role
- RLS: anon cannot read profiles or orders
- Products publicly readable
- No null prices, negative stock
- Status enum validation

### Performance & Security (9)
- Homepage < 3s
- /products < 3s
- No mixed content
- No console errors (homepage, /products)
- XSS protection on search input
- Supabase service key not in page HTML
- robots.txt present
- 404 handled gracefully
- Images have alt text

---

## Next.js migration checklist

When migrating from Vite to Next.js App Router, update:

```
CFG.BASE_URL  →  http://localhost:3000
/login        →  /login  (same, or /auth/login)
/admin        →  /admin  (App Router segment)
/dummy-payment → /dummy-payment or /checkout/payment
/api/webhook  →  /api/webhook  (Route Handler)
```

The Supabase checks are framework-agnostic and need no changes.