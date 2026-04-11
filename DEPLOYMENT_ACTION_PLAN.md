# DEPLOYMENT ACTION PLAN — 60% Completion Audit

**Date:** 2026-04-09
**Status:** Feature code 90% ready | Type system 80% ready | Deployment **BLOCKED** but fixable in ~2.5 hours

---

## 📊 PROGRESS SUMMARY

### What's Done (17/20 features)
✅ **SESSION 2 (5/10 features):**
- Admin Free Shipping Threshold (#11)
- Rating Stars Component (#17)
- WhatsApp Support Button (#18)
- Trust Badges (#19)
- Wishlist Database/API (#20 — structurally complete, types broken)

✅ **SESSION 3 (8/10 features):**
- Order Tracking Page (#21)
- Returns Portal (#22)
- Coupon System API (#23)
- Email System (#24 — pre-existing)
- JSON-LD SEO (#25 — pre-existing)
- OG URL Fixes (#26)
- Order History Page (#28)
- Speed Insights (#29)
- Bundle Analyzer (#30 — pre-existing)

❌ **SESSION 2 (5/10 still pending):**
- Replace console.log statements (#12)
- Fix ESLint useEffect deps #1 (#13)
- Fix ESLint useEffect deps #2 (#14)
- Fix CartContext race condition (#15)
- Replace `<img>` with `<Image>` (#16)

⏸️ **Deferred:**
- Guest Checkout (#27 — requires auth refactor, defer to next session)

### What's Broken (Type Sync Issues)
🔴 **25 TypeScript errors** = 6 tables/RPCs not in `types/database.ts` because **7 migrations not applied to Supabase**

```
app/api/cron/send-emails/route.ts           ← email_queue table
app/api/cron/cleanup-orders/route.ts        ← increment_product_stock RPC
app/api/webhooks/payment/route.ts           ← webhook_events, email_queue
app/api/wishlist/route.ts                   ← wishlists, wishlist_items
components/ui/WishlistButton.tsx            ← wishlists, wishlist_items
```

### What's Incomplete (Missing Integrations)
🟡 **3 features not fully integrated** (code exists, not connected):
- **Coupons**: Admin CRUD works, but checkout form doesn't call validate/apply endpoint
- **Shipping Config**: Admin UI works, but checkout API doesn't call `calculateShipping()`
- **Wishlist**: API routes exist, but ProductCard doesn't show heart button

---

## 🎯 IMMEDIATE NEXT STEPS (2.5 hours to unlock deployment)

### PHASE 1: Apply Migrations (20 min — USER ACTION)

**What:** Run 7 SQL migrations in Supabase dashboard to create new tables/columns

**Why:** Current code references tables that don't exist in database → TypeScript types missing → 25 errors

**How:**
1. Open https://app.supabase.com → your-project → SQL Editor
2. For each file below (in order), copy content → paste in editor → run:
   - `supabase/migrations/20260405151000_webhook_events_table.sql`
   - `supabase/migrations/20260409050000_create_email_queue_table.sql`
   - `supabase/migrations/20260409080000_site_settings.sql`
   - `supabase/migrations/20260409090000_coupons.sql`
   - `supabase/migrations/20260409100000_return_requests.sql`
   - `supabase/migrations/20260409110000_orders_tracking_fields.sql`
   - `supabase/migrations/20260409150028_create_wishlist_tables.sql`
3. Verify each table appears in Supabase Dashboard → Table Editor

**Time:** ~20 minutes (mostly copy-paste)

---

### PHASE 2: Regenerate Types (5 min — DEVELOPER)

**What:** Update `types/database.ts` with newly created tables

**Why:** TypeScript needs table definitions to compile

**How:**
```bash
# Run from project root
npx supabase gen types typescript > types/database.ts
npm run type-check
```

**Expected result:** 0 errors (currently 25)

**Time:** ~5 minutes

---

### PHASE 3: Integrate Missing Features (20 min — DEVELOPER)

#### 3a: Add Coupon Validation to Checkout (5 min)
**File:** `app/api/checkout/route.ts`

**What to add:** Call `/api/coupons/validate` when coupon code provided
```typescript
// Around line 50, after validating cart:
if (couponCode) {
  const couponRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ couponCode, subtotal }),
  });
  const couponData = await couponRes.json();
  if (couponData.valid) {
    discount = couponData.discountAmount;
  }
}
```

#### 3b: Call calculateShipping in Checkout (5 min)
**File:** `app/api/checkout/route.ts`

**What to add:** Use `calculateShipping()` to get shipping cost
```typescript
import { calculateShipping } from '@/lib/shipping';

// Around line 60, calculate total:
const shippingAmount = await calculateShipping(subtotal);
const taxAmount = subtotal * 0.05; // 5% tax
const totalAmount = subtotal + shippingAmount.amount + taxAmount - discount;
```

#### 3c: Verify Checkout Integration (3 min)
**Test:** Add ₹300 item → checkout → see `₹79` shipping + coupon discount applied

---

### PHASE 4: Add Missing Environment Variables (5 min)

**Location:** https://vercel.com → Projects → roshan7869s-projects/project → Settings → Environment Variables

**Add these 3 new variables:**
```
RESEND_API_KEY = <from Resend.com dashboard>
CRON_SECRET = <generate random string like: "super-secret-abc123xyz">
NOTIFICATIONS_FROM_EMAIL = orders@kaari.in
```

**Why:**
- `RESEND_API_KEY` — email sending service
- `CRON_SECRET` — protects `/api/cron/*` endpoints from public access
- `NOTIFICATIONS_FROM_EMAIL` — "From:" address for order emails

---

### PHASE 5: Test & Deploy (30 min)

**Local testing:**
```bash
npm run build       # Should have 0 errors
npm run dev         # Start development server
```

**Manual QA:**
1. Go to homepage → browse products
2. Add product to cart → see ₹79 shipping
3. Try coupon code `SAVE10` → see discount
4. Complete checkout → order created successfully
5. Go to `/orders` → see new order in history
6. Check `/admin/coupons` → admin can manage coupons
7. Go to `/admin/settings` → admin can change shipping threshold

**Deploy to production:**
```bash
git add .
git commit -m "fix: apply migrations, fix type sync, integrate coupon/shipping"
git push origin backup-before-moving-nextjs
# Vercel auto-deploys on push
```

**Time:** ~30 minutes

---

## 📋 SESSION 2 REMAINING ITEMS (Optional, ~1.5 hours)

**If time permits after Phase 1-5, complete these:**

### #12: Replace console.log (30 min)
**Why:** Production logs leak data, slow performance

**How:**
1. Find all console calls:
   ```bash
   grep -rn "console\." --include="*.ts" --include="*.tsx" app/ lib/ | head -20
   ```
2. Create `lib/logger.ts`:
   ```typescript
   export const logger = {
     debug: (msg: string, ctx?: any) => process.env.NODE_ENV === 'development' && console.log(`[DEBUG] ${msg}`, ctx),
     info: (msg: string, ctx?: any) => console.log(`[INFO] ${msg}`, ctx),
     warn: (msg: string, ctx?: any) => console.warn(`[WARN] ${msg}`, ctx),
     error: (msg: string, ctx?: any) => console.error(`[ERROR] ${msg}`, ctx),
   };
   ```
3. Replace `console.log('X')` → `logger.info('X')`
4. Verify: `grep -rn "console\." app/ lib/ | wc -l` → should be 0

**Files to update:** ~46 instances across codebase

---

### #13: Fix ESLint Warning (useCallback #1) (5 min)
**File:** `app/admin/reviews/page.tsx`

**Issue:** `applyFilters` function recreated on every render, stale closure bug

**Fix:**
```typescript
import { useCallback } from 'react';

// Change this:
const applyFilters = () => { ... }
useEffect(() => { applyFilters() }, [status, sort]) // ESLint warning

// To this:
const applyFilters = useCallback(() => { ... }, [reviews, status, sort])
useEffect(() => { applyFilters() }, [applyFilters])
```

---

### #14: Fix ESLint Warning (useCallback #2) (5 min)
**File:** `hooks/useProductReviews.ts`

**Issue:** `fetchReviews` not in dependency array

**Fix:**
```typescript
// Wrap in useCallback with productId dependency
const fetchReviews = useCallback(async () => {
  // ... fetch logic
}, [productId])

useEffect(() => {
  if (productId) fetchReviews()
}, [fetchReviews])
```

---

### #15: Fix CartContext Race Condition (5 min)
**File:** `contexts/CartContext.tsx`

**Issue:** Cart fetches before auth finishes loading → empty cart flashes on login

**Fix:**
```typescript
useEffect(() => {
  // CRITICAL: Wait for auth to finish loading
  if (authLoading) return

  if (!user?.id) {
    setCart(null)
    setLoading(false)
    return
  }

  // ... fetch cart logic
}, [user?.id, authLoading]) // Add authLoading dependency
```

---

### #16: Replace `<img>` with `Image` (15 min)
**File:** `components/pages/admin/AdminProductForm.tsx`

**Why:** Optimize admin image previews (50-80% smaller with WebP)

**Change all `<img>` tags to `<Image>` with width/height:**
```typescript
// Before:
<img src={imageUrl} alt="Preview" className="w-32 h-32" />

// After:
import Image from 'next/image'
<Image src={imageUrl} alt="Preview" width={128} height={128} className="object-cover" />
```

---

## ✅ FINAL CHECKLIST BEFORE LAUNCH

- [ ] **PHASE 1:** 7 migrations applied to Supabase
- [ ] **PHASE 2:** `npm run type-check` returns 0 errors
- [ ] **PHASE 3a:** Coupon validation integrated in checkout API
- [ ] **PHASE 3b:** `calculateShipping()` called in checkout API
- [ ] **PHASE 3c:** Manual checkout test passes (add item → see shipping → apply coupon → submit)
- [ ] **PHASE 4:** 3 env vars added to Vercel
- [ ] **PHASE 5:** Production deployment successful
- [ ] Smoke test: Home → Product → Cart → Checkout → Order confirmation
- [ ] Admin verification: Can change shipping threshold → takes effect

**Optional (if time):**
- [ ] #12: Replace console.log (30 min)
- [ ] #13-14: useCallback fixes (10 min)
- [ ] #15: CartContext race fix (5 min)
- [ ] #16: Image optimization (15 min)

---

## ⏱️ TIME ESTIMATE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Apply migrations | 20 min | 🔴 BLOCKED |
| 2 | Regenerate types | 5 min | ⏳ Waiting for Phase 1 |
| 3 | Integrate features | 25 min | ⏳ Waiting for Phase 2 |
| 4 | Add env vars | 5 min | ⏳ Parallel with Phase 3 |
| 5 | Test & deploy | 30 min | ⏳ Waiting for Phase 3-4 |
| **TOTAL** | **Phases 1-5** | **85 min** | **🎯 TO LAUNCH** |
| Optional | Session 2 items | 90 min | 📅 Next iteration |

---

## 🎯 SUCCESS CRITERIA

✅ **Launch ready when:**
1. `npm run type-check` → 0 errors
2. `npm run build` → success
3. Checkout workflow tested end-to-end
4. Coupon discount visible in order summary
5. Shipping calculated from config (not hardcoded)
6. Admin can change shipping threshold → immediate effect
7. Wishlist feature works (heart button, `/wishlist` page)
8. No console.log errors in production logs

---

## 📁 FILES NEEDING CHANGES

**Must modify:**
- ❌ `app/api/checkout/route.ts` — add coupon + shipping integration
- ❌ `types/database.ts` — auto-generated (after migrations applied)

**Should modify (if time):**
- ❌ `lib/logger.ts` — create new
- ❌ `app/admin/reviews/page.tsx` — useCallback #1
- ❌ `hooks/useProductReviews.ts` — useCallback #2
- ❌ `contexts/CartContext.tsx` — race condition fix
- ❌ `components/pages/admin/AdminProductForm.tsx` — Image optimization

---

## 📞 NEXT ACTIONS

**For USER (20 min):**
- Apply 7 migrations to Supabase
- Add 3 env vars to Vercel

**For DEVELOPER (120 min):**
1. ✅ Regenerate types (after migrations applied)
2. ✅ Integrate coupon + shipping in checkout API
3. ✅ Manual testing
4. ✅ Deploy to production
5. 📅 (Optional) Complete Session 2 items

Ready to proceed?

