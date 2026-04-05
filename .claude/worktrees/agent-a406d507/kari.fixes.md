# Kaari Marketplace — Audit Fix Guide

## Generated from audit results (21 Mar 2026)

Score before: **45–48%** · Target after applying fixes: **85%+**

---

## Fix 1 — Auth: Login error feedback missing

**Audit failure:** `Invalid credentials show error` → "No error feedback on bad credentials"

**File:** `src/pages/Login.tsx` (or wherever your login form lives)

Replace your login submit handler with this pattern:

```tsx
// src/pages/Login.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      // ← THIS is what the audit was looking for
      setError(error.message);   // e.g. "Invalid login credentials"
      return;
    }
    navigate("/");
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ← Error banner — audit checks for [role="alert"] */}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

**Why this fixes it:** The audit looks for `[role="alert"]` or body text containing "invalid/error/failed".
The `role="alert"` div makes it pass the Playwright selector check.

---

## Fix 2 — Products: No product cards rendered

**Audit failure:** `/products listing — cards rendered` → "No product cards rendered"

This has two possible causes. Fix both:

### 2a — Add `data-testid` to ProductCard

**File:** `src/components/ProductCard.tsx`

```tsx
// Find your product card root element and add data-testid:
<div
  data-testid="product-card"   // ← add this line
  className="..."
>
  {/* existing card content */}
</div>
```

### 2b — Ensure Supabase env vars are loaded

**File:** `.env` (in project root, same level as `package.json`)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

**Verify in your Supabase client:**

```ts
// src/lib/supabase.ts  or  src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env\n" +
    "Copy from: Supabase Dashboard → Project Settings → API"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 2c — Seed test products (if table is empty)

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Insert test products
INSERT INTO products (name, slug, description, is_active)
VALUES
  ('Sunrise Tote Bag',    'sunrise-tote-bag',    'Handcrafted cotton tote', true),
  ('Boho Wall Hanging',   'boho-wall-hanging',   'Macramé wall art',        true),
  ('Rainbow Baby Blanket','rainbow-baby-blanket', 'Soft merino wool blanket',true);

-- Insert variants (link to product IDs from above)
INSERT INTO product_variants (product_id, price, stock_qty, sku)
SELECT id, 1299, 20, 'KR-TOT-001' FROM products WHERE slug='sunrise-tote-bag'
UNION ALL
SELECT id, 2499, 8,  'KR-WAL-001' FROM products WHERE slug='boho-wall-hanging'
UNION ALL
SELECT id, 1899, 3,  'KR-BLK-001' FROM products WHERE slug='rainbow-baby-blanket';

-- Insert media (replace with real Supabase Storage URLs or use placeholder)
INSERT INTO product_media (product_id, url, is_primary)
SELECT id, 'https://placehold.co/400x400?text=Product', true FROM products;
```

---

## Fix 3 — 404 Page: Returns blank

**Audit failure:** `404 page returns content (not blank)` → "404 returns blank page"

**File:** `src/pages/NotFound.tsx`

```tsx
// src/pages/NotFound.tsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] px-4">
      <div className="text-center max-w-md">
        {/* Large decorative number */}
        <div className="text-[120px] font-bold leading-none text-[#E2D9CE] select-none">
          404
        </div>

        <h1 className="text-2xl font-semibold text-[#18130F] mt-4 mb-2">
          Page not found
        </h1>

        <p className="text-[#9B8F85] text-sm mb-8">
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back to browsing handmade goods.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#C4522A] text-white rounded-lg text-sm font-medium hover:bg-[#A8401D] transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-2.5 border border-[#E2D9CE] text-[#18130F] rounded-lg text-sm font-medium hover:bg-[#F5F2EF] transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**File:** `src/App.tsx` — ensure the 404 route is registered:

```tsx
// In your routes array / JSX:
import NotFound from "./pages/NotFound";

// Inside your <Routes> or router config:
<Route path="*" element={<NotFound />} />
```

---

## Fix 4 — Console error: 404 resource on /products

**Audit failure:** `No 404 resource errors on /products` → "Failed to load resource: 404"

This is typically a broken image, missing font, or bad import path.

**To diagnose:**

```bash
# Open browser → http://localhost:8080/products
# Open DevTools → Network tab → filter by "4xx"
# The failing resource URL will appear
```

**Common culprits and fixes:**

```tsx
// ❌ Wrong — hardcoded path that doesn't exist
<img src="/images/hero-bg.jpg" />

// ✅ Fix — import via Vite (validated at build time)
import heroBg from "@/assets/images/hero-bg.jpg";
<img src={heroBg} alt="Hero background" />

// ❌ Wrong — Supabase Storage URL without a fallback
<img src={product.image_url} />

// ✅ Fix — always provide fallback for Supabase Storage images
<img
  src={product.image_url || "/placeholder-product.jpg"}
  alt={product.name}
  onError={e => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }}
/>
```

**Add a placeholder image:**

```bash
# Copy any PNG into public/ folder:
cp some-image.png public/placeholder-product.jpg
```

---

## Fix 5 — Supabase DB credentials for db-check

**Audit failure:** `Supabase connection` → "SUPABASE_URL or SUPABASE_SERVICE_KEY not set"

The db-check script needs the **service role** key (not the anon key).

```batch
REM Windows — run before npm run db-check
set SUPABASE_URL=https://xxxx.supabase.co
set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
npm run db-check
```

**Where to find your keys:**
Supabase Dashboard → Project Settings → API

- `SUPABASE_URL` = "Project URL"
- `SUPABASE_SERVICE_KEY` = "service_role" key (under "Project API keys")
  ⚠️ Never put the service_role key in your `.env` or client code — only use it in audit scripts.

---

## Fix 6 — npm audit vulnerabilities

**From:** `npm audit` — 6 vulnerabilities (3 low, 2 moderate, 1 high)

```bash
# Fix safe vulnerabilities first (no breaking changes)
npm audit fix

# Fix the high-severity flatted vulnerability
# (This IS safe — just a patch bump)
npm install flatted@latest

# For esbuild/vite vulnerability (requires Vite version bump)
# Check your app still works after this:
npm install vite@latest

# For jsdom (only in test dependencies):
npm install --save-dev jsdom@latest
```

After fixing:

```bash
npm audit
# Should show: found 0 vulnerabilities
```

---

## Fix 7 — Create test accounts for audit

**Audit failures:** "Login did not redirect" / "Admin login failed"

Run this in your terminal to create test accounts via Supabase CLI,
OR do it manually in the Dashboard.

**Via Supabase Dashboard (easiest):**

1. Go to Authentication → Users → "Add user"
2. Create `test.user@kaari.in` with password `Audit@2024!`
3. Create `admin@kaari.in` with password `Admin@2024!`
4. Get the admin user's UUID from the users list
5. Run in SQL Editor:

   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('<admin-user-uuid-here>', 'admin')
   ON CONFLICT DO NOTHING;
   ```

---

## Quick fix priority order

| Priority | Fix | Impact |
|----------|-----|--------|
| 🔴 1 | Create test accounts in Supabase Auth | Unlocks Cart, Checkout, Admin suites |
| 🔴 2 | Set env vars before running audit | Unlocks DB Integrity suite |
| 🔴 3 | Login error display (Fix 1) | Fixes Auth suite HIGH check |
| 🔴 4 | Seed products in Supabase (Fix 2c) | Fixes Product suite CRITICAL |
| 🟡 5 | Add `data-testid="product-card"` (Fix 2a) | Improves selector reliability |
| 🟡 6 | Fix 404 resource on /products (Fix 4) | Fixes Perf MEDIUM check |
| 🟡 7 | Fix NotFound page (Fix 3) | Fixes Perf MEDIUM check |
| 🟢 8 | npm audit fix (Fix 6) | Security hygiene |

After fixes 1–4: expected score **~82%**
After all fixes:  expected score **~95%**
