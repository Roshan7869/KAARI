# Kaari Bug Report — 2026-04-13
**Inspector**: Claude Code (Senior Tech Lead Mode)  
**Site**: http://localhost:3000  
**Total bugs found**: 25

---

## CRITICAL BUGS (site-breaking, fix before anything else)

### BUG-001
**Severity**: CRITICAL  
**Page**: All pages with "Add to Cart" and cart functionality  
**Element**: Cart API (`/api/cart`)  
**What should happen**: Adding items to cart should work; cart should persist between page loads  
**What actually happens**: Both GET and POST to `/api/cart` return HTTP 500 with error: `invalid input syntax for type uuid: "user_3C9UBthJhojlqP7qDLlZ2pnbBRW"`  
**Console error**: Toast notification: "invalid input syntax for type uuid..."  
**Network error**: 500 on `/api/cart` GET and POST  
**Root cause file**: `app/api/cart/route.ts` — Clerk user IDs (`user_xxx`) are passed directly to Supabase queries that expect UUID format. The `profiles` table likely has a UUID `id` column, but Clerk user IDs are not UUIDs. Need a mapping layer or `clerk_id` column.  
**Screenshot**: add-to-cart-uuid-error.png

### BUG-002
**Severity**: CRITICAL  
**Page**: All pages displaying shipping thresholds  
**Element**: Shipping calculation across 7+ locations  
**What should happen**: Consistent free shipping threshold displayed to customers and enforced in code  
**What actually happens**: At least 4 different thresholds are used:
- Announcement bar: "Free Shipping ₹999+"
- Trust badges: "Free Shipping Orders ₹500+"
- Cart API (`/api/cart/route.ts` line 100): threshold = 999, base = 99
- Checkout API (`/api/checkout/route.ts` line 182): threshold = **500**, base = 99
- `lib/shipping.ts` line 6: threshold = 999, base = 79
- Legal shipping page (`/legal/shipping`): threshold = 499, base = 69
- CartContext line 88: **no threshold at all** — always charges 99  
**Console error**: none  
**Network error**: none  
**Root cause file**: Multiple files — no single source of truth for shipping config  
**Screenshot**: homepage-full.png (shows conflicting thresholds on same page)

### BUG-003
**Severity**: CRITICAL  
**Page**: `/products/[slug]` — Product detail page  
**Element**: Reviews section  
**What should happen**: Reviews should load from database  
**What actually happens**: Supabase RPC `get_product_reviews_user` returns 404 — function does not exist in the database  
**Console error**: none (fails silently)  
**Network error**: 404 on `POST /rest/v1/rpc/get_product_reviews_user`  
**Root cause file**: `app/api/products/[id]/reviews/route.ts` — calls a Supabase RPC function that hasn't been created in the database  
**Screenshot**: N/A (silent failure)

---

## HIGH PRIORITY BUGS (major features broken)

### BUG-004
**Severity**: HIGH  
**Page**: `/cart`  
**Element**: CartContext `calculatePricing` function  
**What should happen**: Free shipping applied when subtotal >= 999  
**What actually happens**: Line 88 always charges ₹99 shipping regardless of order total (`const shipping = subtotal > 0 ? 99 : 0`) — no free shipping threshold check  
**Console error**: none  
**Network error**: none  
**Root cause file**: `contexts/CartContext.tsx` line 88  
**Screenshot**: N/A

### BUG-005
**Severity**: HIGH  
**Page**: `/cart`  
**Element**: Tax calculation  
**What should happen**: GST should be displayed in cart summary  
**What actually happens**: CartContext hardcodes `const tax = 0` — GST is calculated server-side at checkout but never shown to users in cart. Cart total will be lower than checkout total.  
**Console error**: none  
**Network error**: none  
**Root cause file**: `contexts/CartContext.tsx` lines 86-91  
**Screenshot**: N/A

### BUG-006
**Severity**: HIGH  
**Page**: Homepage, product detail, footer  
**Element**: WhatsApp number  
**What should happen**: Consistent WhatsApp number across all components  
**What actually happens**: Two different numbers appear:
- Announcement bar + WhatsApp float: `917869613579` (uses env var)
- Footer + ProductShareBox: `919131548788` (hardcoded)  
**Console error**: none  
**Network error**: none  
**Root cause file**: `components/KaariFooter.tsx` line 32, `components/products/ProductShareBox.tsx` line 51  
**Screenshot**: homepage-full.png (shows both numbers on same page)

### BUG-007
**Severity**: HIGH  
**Page**: All email touchpoints  
**Element**: Email templates  
**What should happen**: Consistent domain in all customer-facing URLs  
**What actually happens**: Email templates link to `kaari.shop` but the website is `kaari.in`. Emails from `hello@kaari.shop` but contact page shows `hello@kaari.in`  
**Console error**: none  
**Network error**: none  
**Root cause file**: `lib/email-templates/base.ts`, `lib/email-templates/order-confirmation.tsx`, `lib/payment-secure.ts` lines 287, 317  
**Screenshot**: N/A

### BUG-008
**Severity**: HIGH  
**Page**: `/contact`  
**Element**: Contact form  
**What should happen**: Form submits to an API endpoint and sends email  
**What actually happens**: The `<form>` element has no `action` attribute and no `onSubmit` handler — clicking "Send Message" does a standard HTML POST to the current URL, resulting in a 404 or error page  
**Console error**: none  
**Network error**: POST `/contact` returns error  
**Root cause file**: `app/contact/page.tsx` lines 67-98  
**Screenshot**: N/A

### BUG-009
**Severity**: HIGH  
**Page**: `/legal/shipping`  
**Element**: Shipping policy content  
**What should happen**: Legal policy should match actual shipping charges  
**What actually happens**: Policy says "Free shipping on orders above ₹499" with ₹69 base shipping, but code uses thresholds of 999/500 and base costs of 79/99  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/legal/shipping/page.tsx` lines 63, 79  
**Screenshot**: N/A

### BUG-010
**Severity**: HIGH  
**Page**: All pages  
**Element**: `lib/shipping.ts` — configurable shipping module  
**What should happen**: All shipping calculations should use the centralized `calculateShipping()` function  
**What actually happens**: The `lib/shipping.ts` module exports `getShippingConfig()` and `calculateShipping()` but **no component or API route imports them**. Cart, checkout, and CartContext all hardcode their own shipping logic independently. The configurable shipping system is dead code.  
**Console error**: none  
**Network error**: none  
**Root cause file**: `lib/shipping.ts` (never imported anywhere except type definitions)  
**Screenshot**: N/A

### BUG-011
**Severity**: HIGH  
**Page**: Homepage  
**Element**: Billboard/hero section  
**What should happen**: Either show a hero image/carousel or show nothing (no admin-only text)  
**What actually happens**: Text "No billboard products yet. Admin can add products via Admin → Billboard." is visible to all site visitors  
**Console error**: none  
**Network error**: none  
**Root cause file**: Homepage component  
**Screenshot**: homepage-initial.png

---

## MEDIUM PRIORITY BUGS (features work but incorrectly)

### BUG-012
**Severity**: MEDIUM  
**Page**: `/products/[slug]`  
**Element**: Breadcrumb navigation  
**What should happen**: Breadcrumb category link should use same URL param format as navbar  
**What actually happens**: Breadcrumb uses `?category=Crochet+Handbags` while navbar uses `?cat=Crochet%20Handbags` — inconsistent URL parameter names (`category` vs `cat`)  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/products/[slug]/page.tsx`  
**Screenshot**: N/A (observed in browser DOM)

### BUG-013
**Severity**: MEDIUM  
**Page**: All pages  
**Element**: Page `<title>` tags  
**What should happen**: Clean page titles  
**What actually happens**: Page titles are duplicated: "White Flower Bag | Kaari - Handmade Crochet Marketplace | Kaari - Handmade Crochet Marketplace" — the template string appears twice  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/products/[slug]/page.tsx` metadata or layout template  
**Screenshot**: N/A (visible in browser tab title)

### BUG-014
**Severity**: MEDIUM  
**Page**: `/products`  
**Element**: Page heading  
**What should happen**: Heading should read "Shop All Products" with proper spacing  
**What actually happens**: Heading renders as "ShopAllProducts" — no space between words  
**Console error**: none  
**Network error**: none  
**Root cause file**: Products page component (likely missing space in heading concatenation)  
**Screenshot**: N/A (visible in page DOM)

### BUG-015
**Severity**: MEDIUM  
**Page**: All pages  
**Element**: Cart API routes  
**What should happen**: User cart operations should use authenticated Supabase client with RLS  
**What actually happens**: All cart API routes use `createAdminClient()` which bypasses Row Level Security. While ownership checks exist in code, RLS provides defense-in-depth that is bypassed.  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/api/cart/route.ts`, `app/api/cart/items/[id]/route.ts`, `app/api/cart/merge/route.ts`  
**Screenshot**: N/A

### BUG-016
**Severity**: MEDIUM  
**Page**: `/products/[slug]`  
**Element**: Product detail page metadata  
**What should happen**: Use shared `APP_URL` from `lib/metadata.ts`  
**What actually happens**: Declares its own `const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://kaari.in').trim()` — duplicates the config  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/products/[slug]/page.tsx` line 11  
**Screenshot**: N/A

### BUG-017
**Severity**: MEDIUM  
**Page**: Checkout flow  
**Element**: CSRF protection  
**What should happen**: CSRF tokens should protect all state-changing operations  
**What actually happens**: CSRF cookie (`__Host-csrf`) is only set on `/checkout` paths. The checkout form reads it from `document.cookie`, but other POST endpoints are unprotected.  
**Console error**: none  
**Network error**: none  
**Root cause file**: `middleware.ts` lines 152-163  
**Screenshot**: N/A

### BUG-018
**Severity**: MEDIUM  
**Page**: Checkout  
**Element**: Coupon discount vs shipping calculation  
**What should happen**: Shipping should be calculated on the post-discount subtotal (or clearly documented that it's pre-discount)  
**What actually happens**: Shipping is calculated on the original `subtotal` before coupon discount is applied  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/api/checkout/route.ts` lines 176-185  
**Screenshot**: N/A

### BUG-019
**Severity**: MEDIUM  
**Page**: `/admin` (direct URL access)  
**Element**: `/admin/analytics` page  
**What should happen**: 404 or redirect  
**What actually happens**: The `/admin/analytics` route does not exist as a page. Navigating to it would show the admin layout with no content area. Other missing admin pages: `/admin/settings` is just a profile form, not a full settings panel.  
**Console error**: none  
**Network error**: none  
**Root cause file**: Missing `app/admin/analytics/page.tsx`  
**Screenshot**: N/A

---

## LOW PRIORITY BUGS (cosmetic, minor)

### BUG-020
**Severity**: LOW  
**Page**: Homepage  
**Element**: Category grid  
**What should happen**: All 5 categories in navbar should appear in the category grid section  
**What actually happens**: The category grid shows only 4 categories (Handbags, Bouquet, Hair Accessories, Keychains) — **Dolls** is missing from the grid despite being in the navbar  
**Console error**: none  
**Network error**: none  
**Root cause file**: Homepage component  
**Screenshot**: homepage-full.png

### BUG-021
**Severity**: LOW  
**Page**: `/api/cart/route.ts`  
**Element**: Variable name  
**What should happen**: Proper spelling  
**What actually happens**: Variable named `FREE_SHPING_THRESHOLD` — missing 'I' in 'SHIPPING'  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/api/cart/route.ts` line 100  
**Screenshot**: N/A

### BUG-022
**Severity**: LOW  
**Page**: All pages  
**Element**: Business address  
**What should happen**: Single source of truth for address  
**What actually happens**: Bhopal, Madhya Pradesh address hardcoded in 5+ files  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/structured-data.ts`, `app/contact/page.tsx`, `app/legal/shipping/page.tsx`, `app/layout.tsx`, `app/legal/cancellation/page.tsx`  
**Screenshot**: N/A

### BUG-023
**Severity**: LOW  
**Page**: `/admin`  
**Element**: Dashboard page meta tags  
**What should happen**: Admin pages should have `noindex` meta tag  
**What actually happens**: Admin dashboard has `title: "Admin Dashboard | Kaari"` but no `noindex` — search engines could index it  
**Console error**: none  
**Network error**: none  
**Root cause file**: `app/admin/page.tsx`  
**Screenshot**: N/A

### BUG-024
**Severity**: LOW  
**Page**: Homepage  
**Element**: Hydration  
**What actually happens**: React hydration mismatch warning — `className` differs between server and client render (relative vs absolute positioning on image container)  
**Console error**: "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties"  
**Network error**: none  
**Root cause file**: Likely `components/home/ArtisanStory.tsx` — `className="relative"` on server vs without on client  
**Screenshot**: N/A (browser console error)

### BUG-025
**Severity**: LOW  
**Page**: Products page  
**Element**: Product badges  
**What should happen**: Only actually new products should show "NEW" badge  
**What actually happens**: All 9 visible products show the "NEW" badge regardless of creation date  
**Console error**: none  
**Network error**: none  
**Root cause file**: Products grid component  
**Screenshot**: products-page.png

---

## AFFECTED PAGES SUMMARY

| Page | Bugs Found | Severities |
|------|-----------|------------|
| Homepage | 4 | 1 CRITICAL, 2 HIGH, 1 LOW |
| Products listing | 2 | 1 MEDIUM, 1 LOW |
| Product detail | 3 | 1 CRITICAL, 2 MEDIUM |
| Cart | 3 | 1 CRITICAL, 2 HIGH |
| Checkout | 2 | 1 CRITICAL, 1 MEDIUM |
| Contact | 1 | 1 HIGH |
| Legal/Shipping | 1 | 1 HIGH |
| All pages (shipping) | 1 | 1 CRITICAL |
| All pages (WhatsApp) | 1 | 1 HIGH |
| Email templates | 1 | 1 HIGH |
| Admin | 1 | 1 MEDIUM |

---

## ROOT CAUSE ANALYSIS

### Root Cause 1: Clerk-to-Supabase ID Mapping Missing (3 bugs)
The Clerk user ID format (`user_3C9UBthJhojlqP7qDLlZ2pnbBRW`) is not a valid UUID, but Supabase tables use UUID primary keys. The app needs either:
- A `clerk_id` column in the `profiles` table that stores the Clerk user ID
- A lookup function that maps Clerk ID → Supabase UUID
- All API routes that use `userId` need to resolve the Clerk ID to a Supabase UUID before querying

**Affected bugs**: BUG-001 (cart 500), and any other user-specific operations

### Root Cause 2: No Single Source of Truth for Shipping Config (5 bugs)
Shipping thresholds and base costs are hardcoded in 7+ places with different values. The `lib/shipping.ts` module was designed to be the single source but is never imported anywhere.

**Fix**: Import `calculateShipping` from `lib/shipping.ts` in all locations that currently hardcode shipping values, and remove all duplicate constants.

**Affected bugs**: BUG-002, BUG-004, BUG-005, BUG-009, BUG-010

### Root Cause 3: Hardcoded Constants in Multiple Files (4 bugs)
WhatsApp number, email domain, and business address are hardcoded in some components while using env vars in others.

**Fix**: Create a shared config module (`lib/config.ts`) with all constants, and import it everywhere.

**Affected bugs**: BUG-006, BUG-007, BUG-022, and the email domain inconsistency

---

## RECOMMENDED FIX ORDER

**Top 10 bugs to fix first for maximum impact:**

1. **BUG-001** — Cart UUID mapping (blocks all cart/checkout functionality)
2. **BUG-002** — Shipping threshold inconsistency (legal + financial risk)
3. **BUG-003** — Missing Supabase RPC function (reviews broken)
4. **BUG-004** — CartContext always charges shipping (direct revenue impact)
5. **BUG-005** — Tax always 0 in cart (surprise charges at checkout)
6. **BUG-006** — WhatsApp number inconsistency (customer confusion)
7. **BUG-008** — Contact form non-functional (lost customer inquiries)
8. **BUG-010** — Shipping module dead code (technical debt enabling BUG-002)
9. **BUG-011** — Billboard admin text visible to users (unprofessional)
10. **BUG-013** — Duplicate page titles (SEO impact)

---

## SCREENSHOTS INDEX

| Filename | Description |
|----------|-------------|
| homepage-initial.png | Homepage initial load (shows billboard admin text, shipping inconsistency) |
| homepage-full.png | Full page homepage screenshot |
| products-page.png | Products listing page (all items show NEW badge) |
| add-to-cart-uuid-error.png | Add to Cart toast showing UUID error |