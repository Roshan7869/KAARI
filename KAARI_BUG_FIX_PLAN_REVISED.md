# KAARI — REVISED BUG FIX PLAN
## Tailored for Next.js Migration + Local Development

**Current State:**
- Branch: `backup-before-moving-nextjs`
- Stack: Next.js 14, Supabase, Cashfree UPI, Cloudinary
- Status: Mid-migration, not yet on Vercel production
- Focus: Fix local dev issues first, production setup after migration complete

---

# ═══════════════════════════════════════════════════════════════════
# PHASE 1: LOCAL DEVELOPMENT — SETUP & DATA QUALITY (45 minutes)
# Expected result: Site fully functional in `npm run dev`
# ═══════════════════════════════════════════════════════════════════

## Step 1.1 — Create & Configure `.env.local` (10 minutes)

### Why this first:
Your `.env.local` doesn't exist. Migration requires proper local env setup.

### Command:
```bash
# Copy template
cp .env.example .env.local

# Edit with your actual values
nano .env.local  # or use your editor
```

### Required values for local dev:

```env
# App (localhost)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (from supabase.com dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Cashfree (Sandbox for testing)
# Get from: https://merchant.cashfree.com/dashboard/merchants/login
CASHFREE_APP_ID=YOUR_CASHFREE_APP_ID
CASHFREE_SECRET_KEY=YOUR_CASHFREE_SECRET_KEY
CASHFREE_WEBHOOK_SECRET=YOUR_CASHFREE_WEBHOOK_SECRET
NEXT_PUBLIC_CASHFREE_MODE=sandbox
CASHFREE_TEST_MODE=true

# Cloudinary (for product images)
# Get from: https://console.cloudinary.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=YOUR_CLOUDINARY_UPLOAD_PRESET

# Upstash Redis (optional for local — gracefully degrades without it)
# Get from: https://console.upstash.com
# UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_REDIS_REST_URL
# UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REDIS_REST_TOKEN

# Resend (email, optional for local)
# RESEND_API_KEY=YOUR_RESEND_API_KEY
# NOTIFICATIONS_FROM_EMAIL=[HIDDEN_SECRET]

# Instagram (optional, can be empty)
# INSTAGRAM_BUSINESS_ACCOUNT_ID=
# META_ACCESS_TOKEN=
```

### Verification:
```bash
# Check file exists and is readable
ls -la .env.local

# Verify no secrets are committed (should not exist)
git status | grep .env.local
# Should show: .env.local is in .gitignore ✓
```

---

## Step 1.2 — Fix Rate Limiting Strategy (5 minutes)

### The Issue:
Auth pages currently use `failClosed=true` which returns **503** when Redis is down.
For local dev without Redis, this breaks login/signup.

### Solution:
```bash
# Open middleware.ts
nano middleware.ts
```

**Current code (lines 51-54):**
```ts
if (pathname === '/login' || pathname === '/signup') {
  const rateLimitResponse = await applyRateLimit(request, 'auth', true)  // ← TRUE = FAIL CLOSED
  if (rateLimitResponse) return rateLimitResponse
}
```

**Change to:**
```ts
if (pathname === '/login' || pathname === '/signup') {
  const rateLimitResponse = await applyRateLimit(request, 'auth', false)  // ← FALSE = FAIL OPEN
  if (rateLimitResponse) return rateLimitResponse
}
```

### Why it works:
- `applyRateLimit(..., false)` means: if Redis is down, allow the request through
- Supabase has its own account brute-force protection (configurable in Supabase dashboard)
- No need for Redis at auth layer for protection
- Local dev now works without Upstash

### Verification:
```bash
npm run dev
# Visit http://localhost:3000/login → should load (no 503)
# Visit http://localhost:3000/signup → should load (no 503)
```

---

## Step 1.3 — Clean Product Media CRLF (10 minutes)

### The Issue:
Boho Sunburst Handbag product image URL contains `%0D%0A` (CRLF) — broken image path.

### Solution:

Open Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor):

**Step A — Find affected records:**
```sql
-- Check for CRLF in file paths
SELECT
  id,
  product_id,
  file_path,
  length(file_path) as path_length
FROM product_media
WHERE file_path ~ '[\r\n\t]';
```

**Step B — Clean all CRLF:**
```sql
-- Remove all carriage returns, newlines, tabs
UPDATE product_media
SET file_path = trim(
  regexp_replace(
    file_path,
    '[\r\n\t]+',
    '',
    'g'
  )
)
WHERE file_path ~ '[\r\n\t]';
```

**Step C — Verify fix:**
```sql
-- Check no CRLF remains
SELECT COUNT(*) as remaining_issues FROM product_media
WHERE file_path ~ '[\r\n\t]';
-- Should return: 0
```

### Verification (local):
```bash
npm run dev
# Navigate to `/products` → Find "Boho Sunburst Handbag" → image should load ✓
```

---

## Step 1.4 — Add File Path Sanitization (15 minutes)

### Create sanitizer utility:

```bash
# Create sanitize.ts if it doesn't exist
cat > lib/sanitize.ts << 'EOF'
/**
 * Sanitization utilities — prevent injection attacks and data corruption
 */

/**
 * Sanitize file paths — remove CRLF, null bytes, excess whitespace
 * Prevents directory traversal, injection, and database corruption
 */
export function sanitizeFilePath(raw: string): string {
  return raw
    .replace(/[\r\n\t\0]+/g, '')      // Remove CRLF, null bytes, tabs
    .replace(/\s+/g, ' ')              // Collapse multiple spaces to single
    .replace(/\/+/g, '/')              // Normalize slashes
    .trim()
}

/**
 * Sanitize text input — XSS prevention
 */
export function sanitizeTextInput(raw: string, maxLength = 1000): string {
  return raw
    .substring(0, maxLength)
    .replace(/[<>]/g, '')              // Remove angle brackets
    .trim()
}

/**
 * Validate URL format — prevent javascript:, data: URIs
 */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
    return url.toString()
  } catch {
    throw new Error('Invalid URL format')
  }
}

export default {
  sanitizeFilePath,
  sanitizeTextInput,
  sanitizeUrl,
}
EOF
```

### Use sanitizer in product media uploads:

Find file: `lib/product-media.ts` (or similar) and update any product_media inserts:

```ts
import { sanitizeFilePath } from '@/lib/sanitize'

export async function insertProductMedia(
  supabase,
  productId: string,
  filePath: string,
  sortOrder: number
) {
  const cleanPath = sanitizeFilePath(filePath)

  const { data, error } = await supabase
    .from('product_media')
    .insert({
      product_id: productId,
      file_path: cleanPath,  // ← Always sanitize
      sort_order: sortOrder,
    })
    .select()

  if (error) throw error
  return data
}
```

### Add database constraint (prevent future CRLF):

```sql
-- Add check constraint to product_media table
ALTER TABLE product_media
ADD CONSTRAINT no_crlf_in_file_path
CHECK (
  file_path NOT LIKE '%' || chr(13) || '%'
  AND file_path NOT LIKE '%' || chr(10) || '%'
  AND file_path NOT LIKE '%' || chr(9) || '%'
);
```

### Verification:
```bash
# Try uploading a product with file path — should be clean
# Confirm sanitizer removes special chars
```

---

# ═══════════════════════════════════════════════════════════════════
# PHASE 2: LOCAL TESTING — CORE USER FLOWS (30 minutes)
# ═══════════════════════════════════════════════════════════════════

Start dev server:
```bash
npm run dev
# Should start on http://localhost:3000
```

### Test Checklist:

- [ ] **Homepage loads** → no 503 errors, hero images present, scroll smooth

- [ ] **Login flow works**
  - Click "Sign in" → login form loads
  - Try invalid email → error message shows
  - Try short password → error message shows
  - Sign in with valid account → redirects to home ✓

- [ ] **Signup flow works**
  - Click "Create account" → signup form loads
  - Fill form → submit → account created ✓
  - Email confirmation sent (check console or Resend dashboard if configured)

- [ ] **Product browsing works**
  - `/products` → product grid loads
  - Boho Sunburst Handbag image loads (was broken before CRLF fix)
  - Click product → `/products/[slug]` detail page loads
  - Images display without broken link icon ✓

- [ ] **Cart operations work**
  - Add to cart → no errors
  - Navigate to `/cart` → item shows
  - Modify quantity → update works
  - Remove item → removed from cart ✓

- [ ] **Checkout flow works**
  - Click proceed to checkout → `/checkout` loads (requires login)
  - Fill shipping address
  - Select delivery method (COD test)
  - Submit → creates order ✓

- [ ] **No 503 errors** on any page navigation

---

# ═══════════════════════════════════════════════════════════════════
# PHASE 3: FINISH MIGRATION + MERGE (time varies)
# ═══════════════════════════════════════════════════════════════════

After Phase 1 & 2 pass locally:

1. **Complete any remaining migration work** (per your CLAUDE.md & current branch state)

2. **Run full test suite:**
   ```bash
   npm run lint
   npm run test
   npm run test:watch  # Watch for regressions
   ```

3. **Verify build:**
   ```bash
   npm run build
   # Should complete with 0 errors
   ```

4. **Commit changes:**
   ```bash
   git add .
   git commit -m "Migrate to Next.js: fix auth middleware failClosed, clean CRLF, add sanitization"
   ```

5. **Merge to master:**
   ```bash
   git checkout master
   git pull origin master
   git merge backup-before-moving-nextjs
   git push origin master
   ```

---

# ═══════════════════════════════════════════════════════════════════
# PHASE 4: PRODUCTION DEPLOYMENT (After migration is on master)
# ═══════════════════════════════════════════════════════════════════

### 4.1 — Add to Vercel (when ready to deploy master)

Push to Vercel or configure git integration:
```bash
# If using Vercel CLI
vercel --prod
```

### 4.2 — Set Production Environment Variables

In Vercel dashboard → Settings → Environment Variables → add:

```
UPSTASH_REDIS_REST_URL           (from Upstash console)
UPSTASH_REDIS_REST_TOKEN         (from Upstash console)

CASHFREE_APP_ID                  (production account)
CASHFREE_SECRET_KEY              (production secret)
CASHFREE_WEBHOOK_SECRET          (production webhook secret)
NEXT_PUBLIC_CASHFREE_MODE=production

CLOUDINARY_API_KEY               (if different from sandbox)
CLOUDINARY_API_SECRET            (if different from sandbox)

NEXT_PUBLIC_APP_URL=https://project-eight-green-79.vercel.app
  (or your actual domain when ready)

RESEND_API_KEY                   (if using Resend for emails)
```

### 4.3 — Update Supabase Auth Config

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://project-eight-green-79.vercel.app
  (or your production domain)

Redirect URLs:
  https://project-eight-green-79.vercel.app/**
  https://project-eight-green-79.vercel.app/auth/callback
  http://localhost:3000/**       (keep for local dev)
```

### 4.4 — Test Production

```bash
# Smoke test key flows
curl -I https://project-eight-green-79.vercel.app/login
# Should return 200, NOT 503

# Test product loading
curl -s https://project-eight-green-79.vercel.app/api/products | jq .
# Should return product list

# Monitor error logs
# Vercel → Deployments → select deployment → Logs tab
```

---

# ═══════════════════════════════════════════════════════════════════
# QUICK REFERENCE — WHAT YOU'RE ACTUALLY FIXING
# ═══════════════════════════════════════════════════════════════════

| Phase | Issue | Impact | Time |
|-------|-------|--------|------|
| **1.1** | `.env.local` missing | Supabase/Cashfree won't configure | 10 min |
| **1.2** | failClosed=true on auth | Login/signup returns 503 without Redis | 5 min |
| **1.3** | CRLF in file_path | Boho product image broken | 10 min |
| **1.4** | No sanitization | Future CRLF/injection attacks | 15 min |
| **2** | Test all flows | Catch bugs before merge | 30 min |
| **3** | Migration + merge | Get to master branch | varies |
| **4** | Vercel + prod env vars | Live on production | 20 min |

**Total time to working local dev + tested production build: ~2 hours**

---

# ═══════════════════════════════════════════════════════════════════
# COMMAND CHEATSHEET
# ═══════════════════════════════════════════════════════════════════

```bash
# Local dev setup
npm install
cp .env.example .env.local    # ← Fill in your actual values
npm run dev                   # Start dev server

# Testing
npm run lint                  # Check for ESLint errors
npm run test                  # Run unit tests
npm run build                 # Test production build
curl http://localhost:3000/login  # Verify no 503

# Git workflow
git status                    # Check current state
git add .                     # Stage all changes
git commit -m "fix: ..."      # Commit
git checkout master           # Switch to main branch
git pull origin master        # Get latest
git merge backup-before-moving-nextjs  # Merge migration
git push origin master        # Push to remote

# Supabase SQL
# Open: https://supabase.com/dashboard → SQL Editor
# Then paste the cleanup SQL from Step 1.3
```

---

## Next Steps:
1. Start with **Step 1.1** — create `.env.local`
2. Verify with `npm run dev`
3. Apply each fix in order (1.2 → 1.3 → 1.4)
4. Test Phase 2 checklist
5. Merge when confident

Ready to start? Or any questions on the approach?
