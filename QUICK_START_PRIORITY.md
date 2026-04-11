# ⚡ QUICK START - PRIORITY MATRIX

## 🚨 FIXES REQUIRED BEFORE LAUNCH (48-72 hours)

### Critical Security Fixes (1-2 hours)
```
Priority | Issue | File | Fix | Time
---------|-------|------|-----|------
1️⃣ FIRST | Remove .env secrets from git | [.env](/.env) | git filter-branch + rotate Cashfree keys | 15 min
2️⃣ SECOND | CLOUDINARY_API_SECRET exposure | [app/api/admin/media/*](app/api/admin/media/route.ts#L25) | Use separate webhook secret env var | 20 min
3️⃣ THIRD | Rate limiter failClosed bug | [middleware.ts](middleware.ts) | Add fail-open fallback for Redis timeout | 5 min
```

---

### Critical UX Fixes (8-10 hours)
```
Priority | Issue | File | Impact | Time
---------|-------|------|--------|------
4️⃣ FOURTH | NO GUEST CHECKOUT | [app/checkout/page.tsx](app/checkout/page.tsx) | 🔴 25-35% conversion loss | 4-6h
5️⃣ FIFTH | Webhook Dead-Letter Queue | [app/api/webhooks/payment/route.ts](app/api/webhooks/payment/route.ts) | 🟠 Silent payment failures | 45 min
6️⃣ SIXTH | Webhook timestamp validation | [app/api/webhooks/payment/route.ts:310](app/api/webhooks/payment/route.ts#L310) | 🟠 Replay attack surface | 10 min
7️⃣ SEVENTH | TypeScript errors | Run: npm run type-check | 🟠 Code quality + maintenance | 2h
```

---

## ✨ NICE-TO-HAVE (Week 2)

```
Priority | Issue | File | Impact | Time
---------|-------|------|--------|------
8️⃣ EIGHTH | Search bar missing | [components/Navbar.tsx](components/Navbar.tsx) | 🟠 Product discovery | 2-3h
9️⃣ NINTH | Hero image LCP | [components/home/HeroBillboard.tsx](components/home/HeroBillboard.tsx) | 🟡 Core Web Vitals | 10 min
🔟 TENTH | Form a11y linked errors | [components/pages/Checkout.tsx](components/pages/Checkout.tsx) | 🟡 WCAG 2.1 AA | 20 min
```

---

## 📊 BY THE NUMBERS

**Total Fix Time**: 15.5-19 hours (1 developer, 2-3 days)  
**Most Impactful Fix**: Guest checkout (⬆️ 25% revenue)  
**Easiest Quick Win**: Rate limiter failClosed (5 min)  
**Biggest Risk**: No guest checkout at launch

---

## 🎯 NAVBAR FEATURES CHECKLIST

### ✅ Currently Implemented
- [x] Home link (`/`)
- [x] About link (`/about`)
- [x] Cart with count badge (`/cart`)
- [x] User account dropdown
- [x] Orders link (from dropdown)
- [x] Admin panel (role-protected)
- [x] Sign out button
- [x] Wishlist link (`/wishlist`)
- [x] Mobile hamburger menu
- [x] Skip to main content (a11y)

### ❌ Missing (Add Later)
- [ ] Search bar (Priority: HIGH)
- [ ] Language selector EN/HI (Priority: MEDIUM)
- [ ] Dark mode toggle (Priority: LOW)

---

## 💡 COPY-PASTE FIXES

### Fix #1: Rate Limiter failClosed (5 min)
**In middleware.ts**, replace rate limiting code:
```typescript
try {
  const rateLimit = await limiter.limit(userId);
  if (rateLimit.pending < 1) {
    return NextResponse.json({error: 'Too many requests'}, {status: 429});
  }
} catch (error) {
  logger.warn('Rate limiter unavailable, allowing request', {error: error.message});
  // Fail open - allow request if Redis down
}
```

### Fix #2: Webhook Timestamp (10 min)
**In app/api/webhooks/payment/route.ts**, add before signature check:
```typescript
const NOW = Math.floor(Date.now() / 1000);
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 min

if (Math.abs(NOW - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
  logger.warn('Webhook rejected: timestamp stale', { 
    event_age: NOW - timestamp, 
    threshold: WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS 
  });
  return NextResponse.json({ error: 'Webhook timestamp stale' }, { status: 401 });
}
```

### Fix #3: Hydration Mismatch (5 min)
**In components/pages/Checkout.tsx**, line 247:
```typescript
// ❌ Before (in render)
updated_at: new Date().toISOString(),

// ✅ After (in event handler)
const handleSaveAddress = async () => {
  const now = new Date().toISOString(); // Move inside handler
  const { error } = await supabase.from('addresses').insert({
    // ...
    updated_at: now
  });
};
```

### Fix #4: Logo & Hero Priority (3 min)
**In components/Navbar.tsx** and **components/home/HeroBillboard.tsx**:
```typescript
<Image
  src={...}
  alt="..."
  fill
  priority={true}  // Add this line
  {...otherProps}
/>
```

---

## 🏃 FASTEST LAUNCH PATH (15.5 hours)

**Day 1 (5.5h)**
1. Remove .env secrets + rotate keys (15 min)
2. Fix CLOUDINARY secret + rate limiter (25 min)
3. Run TypeScript fixes (2h)
4. Start guest checkout (2.75h)

**Day 2 (4h)**
1. Finish guest checkout (2h)
2. Add webhook DLQ (45 min)
3. Add webhook timestamp validation (10 min)
4. Test payment flow (1h)

**Day 3 (6h)**
1. Quick wins: priority props + hydration (15 min)
2. Add search bar to navbar (2-3h)
3. Final testing + monitoring (2.75h)

**Result**: ✅ Launch ready + ⬆️23% revenue potential

---

## 📋 WARNING FLAGS

🚩 **CRITICAL**: Run `npm run type-check` immediately to see scope of TS errors  
🚩 **CRITICAL**: Test guest checkout thoroughly before launch (payment flow changed)  
🚩 **MONITOR**: Watch webhook DLQ cron job for failed deliveries  
🚩 **MONITOR**: Track post-launch if guest checkout increases revenue  

---

## ✅ PRE-LAUNCH CHECKLIST

- [ ] npm run type-check (zero errors)
- [ ] npm run lint (zero errors)
- [ ] Guest checkout E2E tested (login path + guest path)
- [ ] Webhook DLQ cron job deployed
- [ ] .env removed from git + force pushed
- [ ] Cashfree keys rotated
- [ ] Cloudinary secret isolated to separate env var
- [ ] Search bar tested with 10+ queries
- [ ] Payment webhook tested with old timestamp (rejected)
- [ ] npm run build succeeds
- [ ] Lighthouse LCP < 2.5s

---

**Start here**: Read [AUDIT_ACTION_PLAN.md](AUDIT_ACTION_PLAN.md) for full details  
**Questions?** Check [BRUTAL_AUDIT_REPORT_2026-04-10.md](BRUTAL_AUDIT_REPORT_2026-04-10.md)

