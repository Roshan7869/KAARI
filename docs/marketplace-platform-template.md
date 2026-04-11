# ╔══════════════════════════════════════════════════════════════════════╗
# ║       MARKETPLACE PLATFORM — RALPH AUTONOMOUS LOOP v2.0             ║
# ║       Reusable Architecture: DB + Backend fixed, Frontend swappable  ║
# ║       Drop this file in project root as: CLAUDE.md                  ║
# ╚══════════════════════════════════════════════════════════════════════╝

---

## 🎯 PRIME DIRECTIVE

You are a senior autonomous engineering agent.
Your mission: build this marketplace to 100% industry-standard market readiness
using the REUSABLE LAYERED ARCHITECTURE defined in this file.

Every decision you make must respect the layer boundaries below.
This architecture is designed so future platforms only require:
  → Swap the THEME TOKENS (colors, fonts, spacing)
  → Reskin PAGE TEMPLATES (layout, copy, imagery)
  → Add EXTENSION TABLES to the database if needed
  → Add EXTENSION API ROUTES if the business logic is new
  → Zero changes to: Auth, Order flow, Payment, Email, Security, Admin panel

You will work CONTINUOUSLY, phase by phase, task by task.
You will NEVER stop for missing credentials, env vars, or external services.
You will produce a DETAILED AUDIT REPORT after every single phase.
You exit ONLY when every metric in the Master Scorecard is GREEN.

---

## ⚙️ PROJECT CONTEXT

```
Project Name : {PROJECT_NAME}           ← FILL THIS IN
Platform Type: {e.g. handmade goods / electronics / food / services}
Framework    : Next.js 14 (App Router)
Language     : TypeScript — strict mode
Styling      : Tailwind CSS + shadcn/ui
Auth         : Supabase Auth (JWT + Google OAuth)
Database     : PostgreSQL (local for testing, VPS for production)
Payments     : {PAYMENT_PROVIDER}       ← e.g. Cashfree / Razorpay / Stripe
Images       : Local storage (testing) → Cloudinary (production)
Email        : Resend
Testing      : Vitest + @testing-library/react + Playwright (E2E)
Phase        : TESTING — no VPS, no Cloudinary, no production infra yet
```

---

## 🔑 GOLDEN RULE — ENV VARIABLES & MISSING CREDENTIALS

> THIS RULE OVERRIDES EVERYTHING.

If ANY task requires an API key, secret, service URL, or credential
that does not exist in .env.local:

Step 1: Add it to .env.local with a placeholder:
```env
# TODO: Replace with real value before production deployment
VARIABLE_NAME=PLACEHOLDER_REPLACE_BEFORE_PROD
```

Step 2: Write ALL code that uses that variable as if it is real.

Step 3: In tests, mock the service using vi.mock() so tests pass
        regardless of whether the real credential exists.

Step 4: Move to the next task. NEVER STOP.

---

## 🏗️ REUSABLE LAYERED ARCHITECTURE

This is the core of this document. Every file you create must belong to
exactly one of these layers. Respect the boundaries religiously.

---

### LAYER 1 — THEME (swap entirely per platform)

**Location**: `styles/theme.css` + `tailwind.config.ts`
**What lives here**: CSS custom properties ONLY. No logic. No components.

```
styles/
  theme.css           ← THE ONLY FILE YOU SWAP PER PLATFORM
    --color-primary        (brand primary color)
    --color-primary-hover
    --color-accent
    --color-background
    --color-surface
    --color-text
    --color-text-muted
    --color-border
    --font-heading         (e.g. "Playfair Display" for artisan, "Inter" for tech)
    --font-body
    --font-mono
    --radius-sm            (border-radius tokens)
    --radius-md
    --radius-lg
    --shadow-sm
    --shadow-md
    --spacing-section      (page section padding)
```

**Rule**: No hardcoded hex colors ANYWHERE in components or pages.
Every color reference MUST use a CSS variable from theme.css.
When you rebrand: change theme.css → entire UI instantly rebrands.

---

### LAYER 2 — CORE UI COMPONENTS (never change between platforms)

**Location**: `components/ui/`
**What lives here**: Fully generic, theme-aware atoms and molecules.
These are wired to theme tokens — they look different on each platform
automatically because they consume CSS variables.

```
components/ui/
  Button.tsx          (variant: primary | secondary | ghost | destructive)
  Input.tsx           (with error state, label, helper text)
  Card.tsx            (base card container)
  Badge.tsx           (status indicator)
  Modal.tsx           (focus-trapped dialog)
  Toast.tsx           (Sonner-based notifications)
  Skeleton.tsx        (loading placeholder — matches component shape)
  Table.tsx           (sortable, with pagination)
  Pagination.tsx
  Rating.tsx          (star rating display + input)
  PriceDisplay.tsx    (formats currency — injected locale/currency)
  ImageGallery.tsx    (next/image carousel)
  EmptyState.tsx      (icon + message + CTA — fully parametric)
  ErrorBoundary.tsx
  LoadingSpinner.tsx
```

**Rule**: No business logic. No API calls. No Supabase imports.
Pure presentational components only.

---

### LAYER 3 — PAGE TEMPLATES (reskin per platform — layout + copy change)

**Location**: `components/templates/`
**What lives here**: Composed page layouts built from Layer 2 components.
Data is passed in as props — no data fetching here.

```
components/templates/
  StorefrontHero.tsx        (hero banner — image + headline + CTA button)
  ProductGrid.tsx           (grid of ProductCard components)
  ProductCard.tsx           (image + name + price + add-to-cart)
  ProductDetailLayout.tsx   (gallery left, info right, tabs below)
  CartDrawer.tsx            (slide-out cart panel)
  CheckoutLayout.tsx        (address form | order summary)
  OrderConfirmationPage.tsx (success state + order details)
  AccountLayout.tsx         (sidebar nav + content area)
  OrderHistoryList.tsx      (table of past orders)
  AdminShell.tsx            (sidebar + header + content — admin wrapper)
  AdminProductTable.tsx     (CRUD table with search + filters)
  AdminOrderTable.tsx       (order management with status updates)
  LegalPageLayout.tsx       (heading + prose content — for all policy pages)
  FooterTemplate.tsx        (columns + logo + social + legal links)
  NavbarTemplate.tsx        (logo + nav items + cart icon + auth)
```

**When building a new platform**:
1. Keep all template FILE NAMES identical
2. Change: layout proportions, font sizes via theme, copy/imagery, 
   hero style, card shape, navigation structure
3. Never change: data prop shapes, component exports, slot names

---

### LAYER 4 — BACKEND MODULES (reuse entirely — minor extension per platform)

**Location**: `app/api/` + `lib/`

#### 4A — CORE API ROUTES (identical on every project)

```
app/api/
  auth/
    login/route.ts
    logout/route.ts
    signup/route.ts
    callback/route.ts       (OAuth callback)
    me/route.ts             (get current user profile)

  products/
    route.ts                (GET: list with filters/pagination, POST: create)
    [id]/route.ts           (GET: single product, PUT: update, DELETE: soft delete)
    [id]/variants/route.ts  (GET/POST variants)
    [id]/reviews/route.ts   (GET/POST reviews)

  cart/
    route.ts                (GET: cart, POST: add item)
    [itemId]/route.ts       (PUT: update qty, DELETE: remove item)
    clear/route.ts          (DELETE: clear cart)

  checkout/
    route.ts                (POST: initiate checkout — returns payment session)
    complete/route.ts       (POST: payment success handler — creates order)

  orders/
    route.ts                (GET: list orders for current user)
    [id]/route.ts           (GET: single order)
    [id]/cancel/route.ts    (POST: cancel order)

  webhooks/
    payment/route.ts        (POST: payment provider webhook — HMAC verified)

  admin/
    products/route.ts
    products/[id]/route.ts
    orders/route.ts
    orders/[id]/route.ts
    orders/[id]/status/route.ts
    users/route.ts
    dashboard/stats/route.ts

  health/route.ts           (GET: system health check)
```

#### 4B — SHARED UTILITIES (never change between projects)

```
lib/
  auth/
    verify-jwt.ts           (SUPABASE_JWT_SECRET verification using jose)
    get-user.ts             (server-side getUser() — always use this, never getSession())
    require-auth.ts         (throws 401 if no valid session)
    require-admin.ts        (throws 403 if not admin role)

  db/
    client.ts               (PostgreSQL connection pool — pg library)
    query.ts                (typed query wrapper with error handling)
    migrate.ts              (run migrations on deploy)

  cache/
    redis-client.ts         (ioredis singleton — graceful fallback if no Redis)
    with-cache.ts           (HOF: withCache(key, ttl, fetchFn))
    invalidate.ts           (invalidateCache(pattern))

  email/
    resend-client.ts        (Resend singleton)
    send-email.ts           (non-blocking email dispatch wrapper)
    templates/
      order-confirmation.ts
      shipping-update.ts
      welcome.ts
      password-reset.ts
      admin-new-order.ts

  payments/
    verify-webhook.ts       (HMAC-SHA256 signature check — provider-agnostic interface)
    create-session.ts       (initiate payment — thin wrapper over provider SDK)

  validations/
    auth.schema.ts          (Zod: LoginSchema, SignupSchema)
    product.schema.ts       (Zod: CreateProductSchema, UpdateProductSchema)
    order.schema.ts         (Zod: CreateOrderSchema, AddressSchema)
    checkout.schema.ts      (Zod: CheckoutSchema)
    review.schema.ts        (Zod: CreateReviewSchema)
    pagination.schema.ts    (Zod: PaginationSchema — shared query params)

  rate-limit/
    index.ts                (lru-cache based — in-memory for testing)
    rules.ts                (auth: 5/15min, checkout: 10/min, forms: 3/min)

  logger/
    index.ts                (pino — structured JSON logging)

  sanitize/
    index.ts                (DOMPurify server-side — user content sanitization)

  errors/
    http-error.ts           (HttpError class with status + message)
    handler.ts              (wrap API routes — catches errors, formats response)
```

**Rule**: Every API route MUST:
1. Call `requireAuth(req)` or `requireAdmin(req)` at line 1 (if protected)
2. Call `z.parse()` or `z.safeParse()` on ALL incoming request bodies
3. Use `withErrorHandler()` wrapper — never raw try/catch in routes
4. Use `logger.info/error()` — never `console.log()`
5. Return consistent response shape: `{ data, error, meta }`

---

### LAYER 5 — DATABASE SCHEMA (extend per platform — core never changes)

#### 5A — CORE TABLES (identical on every project — NEVER modify)

```sql
-- Always use UUIDs, always include audit columns, always soft delete

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','superadmin')),
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_price NUMERIC(12,2),
  cost_price    NUMERIC(12,2),
  stock_qty     INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  category_id   UUID REFERENCES categories(id),
  images        JSONB NOT NULL DEFAULT '[]',
  tags          TEXT[] DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB DEFAULT '{}',   -- platform-specific fields go here
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  parent_id     UUID REFERENCES categories(id),
  image_url     TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- e.g. "Size: Large / Color: Red"
  sku           TEXT UNIQUE,
  price         NUMERIC(12,2),           -- NULL = inherit from product
  stock_qty     INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  options       JSONB NOT NULL DEFAULT '{}',  -- {size: "L", color: "red"}
  images        JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  pincode       TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'IN',
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT UNIQUE NOT NULL,  -- human-readable: ORD-20240101-0001
  user_id         UUID NOT NULL REFERENCES users(id),
  address_id      UUID REFERENCES addresses(id),
  address_snapshot JSONB NOT NULL,       -- copy of address at time of order
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','processing',
                                      'shipped','delivered','cancelled','refunded')),
  subtotal        NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  product_snapshot JSONB NOT NULL,   -- name, image, options at time of order
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2) NOT NULL,
  total_price     NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  provider        TEXT NOT NULL,           -- 'cashfree' | 'razorpay' | 'stripe'
  provider_txn_id TEXT UNIQUE,
  provider_order_id TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'initiated'
                    CHECK (status IN ('initiated','pending','paid','failed','refunded')),
  method          TEXT,                    -- 'upi' | 'card' | 'netbanking'
  webhook_payload JSONB,
  idempotency_key TEXT UNIQUE NOT NULL,   -- prevents double processing
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  order_id        UUID REFERENCES orders(id),
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  images          JSONB DEFAULT '[]',
  is_verified     BOOLEAN NOT NULL DEFAULT false,  -- true if user ordered the product
  is_published    BOOLEAN NOT NULL DEFAULT false,  -- admin moderation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('percentage','fixed','free_shipping')),
  value           NUMERIC(12,2) NOT NULL,
  min_order_value NUMERIC(12,2),
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Required indexes
CREATE INDEX idx_products_category    ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_active   ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug        ON products(slug);
CREATE INDEX idx_orders_user_id       ON orders(user_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_order_id    ON payments(order_id);
CREATE INDEX idx_reviews_product_id   ON reviews(product_id) WHERE is_published = true;
```

#### 5B — EXTENSION TABLES (add per platform — never touch 5A)

These are examples. Add, rename, or skip depending on the platform:

```sql
-- Example: handmade/artisan platform
CREATE TABLE custom_order_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  product_id  UUID REFERENCES products(id),
  description TEXT NOT NULL,
  deadline    DATE,
  budget      NUMERIC(12,2),
  status      TEXT DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example: subscription box platform
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  plan          TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status        TEXT NOT NULL DEFAULT 'active',
  next_billing  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universal extension: custom key-value fields per entity
CREATE TABLE custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,       -- 'product' | 'order' | 'user'
  entity_id   UUID NOT NULL,
  field_key   TEXT NOT NULL,
  field_value TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, field_key)
);
```

**Rule for extension tables**:
- Always reference core tables via FK
- Always include created_at
- Never modify a core table column — use custom_fields JSONB or add a new extension table

---

### LAYER 6 — DEPLOYMENT CONFIG (identical — only env vars change)

```
/
  Dockerfile
  docker-compose.yml
  nginx.conf
  deploy.sh
  ecosystem.config.js     (PM2)
  .env.example            (all variables documented)
  .github/
    workflows/
      ci.yml
```

---

## 📊 MASTER SCORECARD — EXIT CONDITION

Loop exits ONLY when ALL 15 metrics are simultaneously GREEN.

| #  | Metric                         | Target  | Check Command                              |
|----|--------------------------------|---------|--------------------------------------------|
| 01 | TypeScript Errors              | 0       | npx tsc --noEmit                           |
| 02 | ESLint Errors                  | 0       | npx eslint . --ext .ts,.tsx                |
| 03 | Build Success                  | PASS    | npm run build                              |
| 04 | Unit Test Coverage             | >= 80%  | npx vitest run --coverage                  |
| 05 | E2E Critical Paths             | PASS    | npx playwright test                        |
| 06 | Raw <img> Tags                 | 0       | grep -rn "<img " app/ components/          |
| 07 | Bundle Size (main JS)          | < 250kb | npx @next/bundle-analyzer                  |
| 08 | Lighthouse Performance         | >= 85   | lighthouse http://localhost:3000           |
| 09 | Lighthouse SEO                 | >= 90   | (same run)                                 |
| 10 | Lighthouse Accessibility       | >= 85   | (same run)                                 |
| 11 | Lighthouse Best Practices      | >= 90   | (same run)                                 |
| 12 | Security Headers Score         | A grade | npx check-headers (local audit)            |
| 13 | No console.log in production   | 0       | grep -rn "console.log" app/                |
| 14 | Zod on ALL API routes          | 100%    | grep -rL "z.parse\|z.safeParse" app/api/   |
| 15 | Zero TODO-CRITICAL comments    | 0       | grep -rn "TODO-CRITICAL" .                 |

---

## 📋 FULL TASK QUEUE

Work phases in ORDER. Within each phase, work tasks in ORDER.
Mark each task [x] in this file as you complete it.

---

### PHASE 0 — BASELINE AUDIT

Run BEFORE touching any code. Establish ground truth.

- [ ] P0.1: Run full Master Scorecard — record baseline values for all 15 metrics
- [ ] P0.2: Run `npx tsc --noEmit` — count and list all TypeScript errors by file
- [ ] P0.3: Run `npx eslint . --ext .ts,.tsx` — list all warnings and errors
- [ ] P0.4: Run `npm run build` — capture full output, note any warnings
- [ ] P0.5: Run `npx vitest run --coverage` — record current coverage percentage
- [ ] P0.6: Audit all /api/* routes — list which have/lack Zod validation
- [ ] P0.7: Audit all page.tsx files — list which have/lack metadata exports
- [ ] P0.8: Count all raw <img> tags across codebase
- [ ] P0.9: List all getSession() calls that should be getUser()
- [ ] P0.10: List all console.log statements in app/ and components/

OUTPUT: Save PHASE 0 AUDIT REPORT → /audits/phase-0-baseline-audit.md

---

### PHASE 1 — ARCHITECTURE SCAFFOLD

Build the full Layer 2 + 3 + 4B skeleton before any feature work.
This is the scaffold every future project will copy unchanged.

- [ ] P1.1: Create `styles/theme.css` with ALL CSS custom properties listed
      in Layer 1 above. Populate with project brand values from PROJECT CONTEXT.
      Wire ALL Tailwind colors to CSS variables in tailwind.config.ts.
      Rule: grep -rn "#[0-9a-fA-F]\{3,6\}" components/ must return 0 results after this.

- [ ] P1.2: Scaffold ALL Layer 2 core UI components (components/ui/).
      Each component must:
        - Accept a className prop for Tailwind override
        - Use CSS variables for all colors (never hardcoded hex)
        - Export a TypeScript interface for all props
        - Have a companion .test.tsx file (even if just a smoke test)

- [ ] P1.3: Scaffold ALL Layer 3 page templates (components/templates/).
      Each template must:
        - Be 100% prop-driven — zero internal data fetching
        - Export a TypeScript interface for all props
        - Have loading skeleton variant (prop: isLoading: boolean)
        - Have empty state variant where applicable

- [ ] P1.4: Scaffold ALL Layer 4B shared utilities (lib/) — create the files,
      export the function signatures, add TODO-IMPLEMENT placeholders.
      Rule: Every lib/ file must have its type signatures locked down now
      even if implementation is a stub. This prevents TypeScript drift later.

- [ ] P1.5: Scaffold ALL Layer 4A API route files — create route.ts for every
      endpoint listed above. Each file must have:
        - Correct HTTP method handler exported
        - Auth guard call at line 1 (requireAuth or requireAdmin)
        - Zod parse of request body
        - TODO-IMPLEMENT placeholder for business logic
        - withErrorHandler wrapper

- [ ] P1.6: Create lib/errors/http-error.ts and lib/errors/handler.ts.
      withErrorHandler must:
        - Catch HttpError → return {error: message} with correct status
        - Catch ZodError → return {error: "Validation failed", details} with 400
        - Catch unknown → log with logger.error → return {error: "Internal server error"} 500
        - NEVER leak stack traces to client in production

- [ ] P1.7: Create lib/auth/verify-jwt.ts using jose library.
      Add SUPABASE_JWT_SECRET=PLACEHOLDER_REPLACE_BEFORE_PROD to .env.local.
      Replace ALL getSession() calls with getUser() across the codebase.

- [ ] P1.8: Create lib/logger/index.ts using pino.
      Replace ALL console.log/console.error with logger.info/logger.error.

- [ ] P1.9: Replace ALL raw <img> tags with next/image.
      Add images.remotePatterns in next.config.js for localhost.
      Add formats: ['image/webp','image/avif'] and deviceSizes array.

- [ ] P1.10: Tighten middleware.ts matcher:
      matcher: ['/account/:path*','/checkout/:path*','/admin/:path*','/api/admin/:path*']

- [ ] P1.11: Fix all TypeScript strict mode errors found in P0.2.

- [ ] P1.12: Fix all ESLint errors and warnings found in P0.3.

OUTPUT: Save PHASE 1 AUDIT REPORT → /audits/phase-1-architecture-audit.md

---

### PHASE 2 — DATABASE IMPLEMENTATION

- [ ] P2.1: Create migrations/001_core_schema.sql with ALL Layer 5A tables
      exactly as specified. No deviation from the schema above.
      Add all required indexes.

- [ ] P2.2: Create migrations/002_extensions.sql with platform-specific
      Layer 5B tables needed for this project (from PROJECT CONTEXT).
      Document each extension table with a comment explaining its purpose.

- [ ] P2.3: Run migrations on local PostgreSQL. Verify all tables created.
      Run: `\dt` in psql to confirm table list.

- [ ] P2.4: Create lib/db/client.ts using pg library with:
      - Connection pool (max: 10 for test, configurable for prod)
      - statement_timeout: '30s'
      - Graceful connection error handling

- [ ] P2.5: Create lib/db/query.ts — typed query wrapper:
      - queryOne<T>(sql, params) → T | null
      - queryMany<T>(sql, params) → T[]
      - queryCount(sql, params) → number
      - transaction<T>(callback) → T
      All must use parameterized queries — NEVER string concatenation.

- [ ] P2.6: Seed test data: 5 categories, 20 products (with variants),
      2 users (one admin, one customer), 3 orders in different statuses.
      Save to: scripts/seed.ts

OUTPUT: Save PHASE 2 AUDIT REPORT → /audits/phase-2-database-audit.md

---

### PHASE 3 — FEATURE IMPLEMENTATION

Implement business logic for each API module. Work module by module.
Each module must be fully implemented (not stubbed) before moving to next.

- [ ] P3.1: Auth module — implement all auth routes:
      - Login: validate with LoginSchema → Supabase signInWithPassword → return user
      - Signup: validate with SignupSchema → Supabase signUp → insert into users table
      - Google OAuth: callback handler → upsert user record → redirect
      - Me: requireAuth → return user profile from DB
      - Logout: Supabase signOut → clear cookies

- [ ] P3.2: Products module:
      - GET /api/products: paginated list with filters (category, price, tags, search)
        → withCache('products', 3600, queryFn) → Cache-Control: public, s-maxage=300
      - GET /api/products/[id]: single product with variants and reviews
        → withCache('product:{id}', 1800, queryFn) → Cache-Control: public, s-maxage=600
      - POST /api/admin/products: requireAdmin → CreateProductSchema → insert → invalidateCache
      - PUT /api/admin/products/[id]: requireAdmin → UpdateProductSchema → update → invalidateCache
      - DELETE /api/admin/products/[id]: requireAdmin → soft delete (set deleted_at) → invalidateCache

- [ ] P3.3: Cart module (server-side cart stored in DB or session):
      - GET: requireAuth → fetch cart items with product/variant details
      - POST: requireAuth → validate item → check stock → upsert cart item
      - PUT [itemId]: requireAuth → validate qty → update
      - DELETE [itemId]: requireAuth → remove item
      - DELETE clear: requireAuth → remove all items for user

- [ ] P3.4: Checkout + Orders module:
      - POST /api/checkout: requireAuth → CheckoutSchema → calculate total
        → create order (status: pending) → create payment session
        → return {order_id, payment_session}
      - POST /api/checkout/complete: requireAuth → verify payment with provider
        → update order status to confirmed → decrement stock
        → send order confirmation email (non-blocking) → send admin notification
      - GET /api/orders: requireAuth → paginated list of user's orders
      - GET /api/orders/[id]: requireAuth → verify ownership → return order details
      - POST /api/orders/[id]/cancel: requireAuth → verify ownership
        → check cancellation eligibility → update status → restore stock

- [ ] P3.5: Payment webhook:
      - POST /api/webhooks/payment: verify HMAC-SHA256 signature
        → check idempotency_key (reject duplicates)
        → update payment status → update order status accordingly
        → log all webhook events (success and failure)

- [ ] P3.6: Reviews module:
      - GET /api/products/[id]/reviews: public → paginated published reviews
      - POST /api/products/[id]/reviews: requireAuth → verify user ordered product
        → CreateReviewSchema → insert (is_published: false — requires admin approval)
      - PUT /api/admin/reviews/[id]: requireAdmin → approve/reject review

- [ ] P3.7: Admin dashboard stats:
      - GET /api/admin/dashboard/stats: requireAdmin
        → {total_orders, total_revenue, new_customers_today, pending_orders,
           top_products[5], orders_by_status_chart, revenue_last_30_days_chart}

OUTPUT: Save PHASE 3 AUDIT REPORT → /audits/phase-3-features-audit.md

---

### PHASE 4 — TEST COVERAGE (target: >= 80%)

Mock ALL external services. Tests MUST pass with placeholder env vars.

- [ ] P4.1: Cart store tests
      - add item, remove item, update quantity, clear cart
      - cart total with and without discounts
      - stock validation (cannot exceed available stock)

- [ ] P4.2: Checkout flow tests
      - address form validation
      - shipping cost calculation
      - order summary totals
      - order creation payload shape

- [ ] P4.3: Payment webhook tests
      - valid HMAC signature → order marked PAID, stock decremented
      - invalid signature → 401, order unchanged
      - duplicate idempotency key → idempotent, no double processing
      - payment failed → order marked FAILED, stock NOT decremented

- [ ] P4.4: Auth flow tests
      - email/password login success and failure
      - Google OAuth callback
      - role-based route guard (admin vs customer)
      - JWT expiry → force logout
      - logout clears all session data

- [ ] P4.5: Product CRUD tests
      - create product with variants
      - update product fields
      - soft delete (deleted_at set, not hard delete)
      - stock decrement on order placed
      - stock restore on order cancelled

- [ ] P4.6: Security unit tests
      - XSS: malicious script in review body is sanitized
      - SQL injection: parameterized queries reject injection strings
      - Rate limiting: 6th auth attempt → 429
      - Webhook: missing signature header → 401

- [ ] P4.7: All /api/* route tests
      - 200 on valid input with correct response shape
      - 400 on invalid input (Zod fires)
      - 401 on unauthenticated request
      - 403 on customer accessing admin route
      - 500 never leaks stack trace to client

- [ ] P4.8: E2E — full purchase journey (Playwright)
      browse → product → add to cart → checkout → payment success → order confirmed

- [ ] P4.9: E2E — admin journey
      login as admin → create product → verify on storefront

- [ ] P4.10: E2E — auth journey
      signup → login → view account → logout

OUTPUT: Save PHASE 4 AUDIT REPORT → /audits/phase-4-tests-audit.md

---

### PHASE 5 — EMAIL SYSTEM

- [ ] P5.1: Install Resend. Create lib/email/resend-client.ts singleton.
      Add RESEND_API_KEY=PLACEHOLDER_REPLACE_BEFORE_PROD to .env.local.
      Add EMAIL_FROM=noreply@{domain} to .env.local.

- [ ] P5.2: Order confirmation email — HTML + plain text fallback.
      Items table, total, shipping address, order number.
      Triggered: from /api/checkout/complete.

- [ ] P5.3: Shipping update email — tracking number, carrier, ETA.
      Triggered: admin updates order status to "shipped".

- [ ] P5.4: Welcome email on signup — brand intro, link to shop.
      Triggered: Supabase Auth webhook on user.created.

- [ ] P5.5: Password reset email — branded HTML (overrides Supabase default).

- [ ] P5.6: Admin new order notification — order ID, customer, total, items.
      Triggered alongside customer order confirmation.

- [ ] P5.7: Non-blocking dispatch — ALL email sends in setImmediate().
      Checkout response MUST NOT await email. Failures logged, never crash.

OUTPUT: Save PHASE 5 AUDIT REPORT → /audits/phase-5-email-audit.md

---

### PHASE 6 — PERFORMANCE OPTIMIZATION

- [ ] P6.1: ISR on product pages.
      export const revalidate = 3600 on product listing.
      export const revalidate = 1800 on individual product pages.

- [ ] P6.2: Redis cache for hot data.
      Add REDIS_URL=PLACEHOLDER_REPLACE_BEFORE_PROD.
      Use withCache() HOF from lib/cache — not inline caching.
      Products catalog: TTL 1h. Product detail: TTL 30min.
      Invalidate on create/update/delete.

- [ ] P6.3: HTTP cache headers.
      Product listing: Cache-Control: public, s-maxage=300
      Product detail: Cache-Control: public, s-maxage=600
      Cart + user data: Cache-Control: no-store

- [ ] P6.4: Code-split heavy components.
      Admin dashboard, product editor, order manager → dynamic() with loading prop.

- [ ] P6.5: Loading skeletons.
      app/loading.tsx, app/products/loading.tsx,
      app/account/loading.tsx, app/admin/loading.tsx

- [ ] P6.6: Font optimization.
      Use next/font/google for all fonts. display: 'swap', preload: true.
      Remove any direct Google Fonts <link> tags.

- [ ] P6.7: Database query optimization.
      Run EXPLAIN ANALYZE on 5 most common queries.
      Fix any sequential scans with targeted indexes.
      Verify all indexes from Layer 5A schema are present.

OUTPUT: Save PHASE 6 AUDIT REPORT → /audits/phase-6-performance-audit.md

---

### PHASE 7 — SEO & LEGAL COMPLIANCE

- [ ] P7.1: app/robots.ts — allow all, disallow /admin/ and /account/.
      Add NEXT_PUBLIC_SITE_URL=http://localhost:3000 to .env.local.

- [ ] P7.2: app/sitemap.ts — dynamic, queries DB for all live products.
      Home: daily/1.0, Products: weekly/0.8, Static: monthly/0.5.

- [ ] P7.3: metadata export on EVERY page.tsx.
      Product pages: dynamic metadata from DB.
      Root layout: default fallback.

- [ ] P7.4: JSON-LD structured data.
      Product pages: Product schema.
      Home: WebSite + Organization schema.
      Category pages: BreadcrumbList schema.

- [ ] P7.5: /app/terms/page.tsx — Terms of Service.
      Governing law: India (IT Act 2000, Consumer Protection Act 2019).

- [ ] P7.6: /app/privacy/page.tsx — Privacy Policy.
      GDPR principles + Indian DPDP Act 2023 compliant.
      Disclose: Supabase, payment provider, Google.

- [ ] P7.7: /app/refund-policy/page.tsx
- [ ] P7.8: /app/shipping-policy/page.tsx
- [ ] P7.9: /app/cancellation-policy/page.tsx

- [ ] P7.10: Cookie consent banner (no third-party lib).
      Persist in localStorage. Load analytics ONLY after consent.

- [ ] P7.11: Footer with links to all policy pages on every page.

OUTPUT: Save PHASE 7 AUDIT REPORT → /audits/phase-7-seo-legal-audit.md

---

### PHASE 8 — SECURITY HARDENING

- [ ] P8.1: Security headers in next.config.js:
      X-Frame-Options: DENY
      X-Content-Type-Options: nosniff
      Referrer-Policy: strict-origin-when-cross-origin
      Permissions-Policy: camera=(), microphone=(), geolocation=()
      Strict-Transport-Security: max-age=63072000; includeSubDomains
      Content-Security-Policy: strict — allow only trusted origins

- [ ] P8.2: Harden webhook handler — verify HMAC-SHA256 on EVERY request.
      Reject if x-webhook-signature missing or invalid.
      Idempotency key check — no double processing.

- [ ] P8.3: Audit all admin routes — requireAdmin() at line 1 of every handler.
      Role check reads from verified JWT — never from client-sent data.

- [ ] P8.4: Input sanitization — DOMPurify on all user-generated content.
      Reviews, custom order notes, display names, addresses.

- [ ] P8.5: Env var audit — grep for process.env in client components.
      No non-NEXT_PUBLIC_ vars must reach the browser bundle.

- [ ] P8.6: Rate limiting active on:
      Auth: 5 attempts/15min/IP
      Checkout: 10 attempts/min/user
      Forms: 3 submissions/min/IP

- [ ] P8.7: Parameterized queries audit.
      Zero string concatenation in any DB query.

OUTPUT: Save PHASE 8 AUDIT REPORT → /audits/phase-8-security-audit.md

---

### PHASE 9 — ACCESSIBILITY & UX POLISH

- [ ] P9.1: aria-label on all icon-only buttons. Label on all form inputs.
- [ ] P9.2: Keyboard navigation — logical tab order, focus trap in modals,
      Escape closes dropdowns/modals.
- [ ] P9.3: Color contrast — all text/bg combos WCAG AA (4.5:1).
- [ ] P9.4: Loading + error states on all async components.
      error.tsx at each route level. Never a blank white screen.
- [ ] P9.5: Empty states with CTA for: cart, orders, search results,
      category with no products.
- [ ] P9.6: Toast notifications for: add to cart, remove from cart,
      order placed, profile updated, any error.
- [ ] P9.7: Mobile responsiveness at 320px, 375px, 414px, 768px.
      All tap targets >= 44×44px. No horizontal scroll.

OUTPUT: Save PHASE 9 AUDIT REPORT → /audits/phase-9-ux-audit.md

---

### PHASE 10 — DEPLOYMENT READINESS

- [ ] P10.1: Dockerfile (Next.js standalone multi-stage build)
- [ ] P10.2: Add output: 'standalone' to next.config.js
- [ ] P10.3: docker-compose.yml (app + postgres + redis + nginx)
- [ ] P10.4: nginx.conf (reverse proxy, gzip, rate limiting, SSL stubs)
- [ ] P10.5: deploy.sh (git pull → npm ci → build → migrate → pm2 restart)
- [ ] P10.6: scripts/db-backup.sh (pg_dump with 7-day rotation)
- [ ] P10.7: /api/health route
      { status, db, redis, uptime, timestamp, version }
- [ ] P10.8: .github/workflows/ci.yml
      push/PR to main → tsc → eslint → vitest coverage → build
      Fail if coverage < 80%
- [ ] P10.9: .env.example — EVERY variable documented with description comment,
      grouped by service: Auth | Database | Payments | Email | Storage | App
- [ ] P10.10: PM2_SETUP.md with exact setup commands

OUTPUT: Save PHASE 10 AUDIT REPORT → /audits/phase-10-deployment-audit.md

---

## 📝 AUDIT REPORT TEMPLATE

After completing EACH phase, save to /audits/phase-N-NAME-audit.md

```markdown
# Phase N — NAME — Audit Report
Completed: {ISO timestamp}
Duration: {time taken}
Agent: Ralph Autonomous Loop v2.0

## SCORECARD DELTA (Before → After)

| Metric                     | Before    | After     | Delta   | Status    |
|----------------------------|-----------|-----------|---------|-----------|
| TypeScript Errors          | X         | X         | -X      | GREEN/RED |
| ESLint Errors              | X         | X         | -X      | GREEN/RED |
| Build Success              | PASS/FAIL | PASS/FAIL | -       | GREEN/RED |
| Unit Test Coverage         | X%        | X%        | +X%     | GREEN/RED |
| E2E Critical Paths         | PASS/FAIL | PASS/FAIL | -       | GREEN/RED |
| Raw <img> Tags             | X         | X         | -X      | GREEN/RED |
| Bundle Size                | Xkb       | Xkb       | -Xkb    | GREEN/RED |
| Lighthouse Performance     | X         | X         | +X      | GREEN/RED |
| Lighthouse SEO             | X         | X         | +X      | GREEN/RED |
| Lighthouse Accessibility   | X         | X         | +X      | GREEN/RED |
| Lighthouse Best Practices  | X         | X         | +X      | GREEN/RED |
| Security Headers           | X grade   | X grade   | -       | GREEN/RED |
| console.log Count          | X         | X         | -X      | GREEN/RED |
| API Routes with Zod        | X%        | X%        | +X%     | GREEN/RED |
| TODO-CRITICAL Count        | X         | X         | -X      | GREEN/RED |

MARKET READINESS SCORE: X% → X% (GREEN count / 15 × 100)

## TASKS COMPLETED

| Task ID | Description                                    | Result | Notes       |
|---------|------------------------------------------------|--------|-------------|
| PX.1    | ...                                            | DONE   | ...         |

## ARCHITECTURE COMPLIANCE CHECK

| Layer               | Files Created/Modified        | Boundary Respected? |
|---------------------|-------------------------------|---------------------|
| Theme tokens        | styles/theme.css              | YES / VIOLATION     |
| Core UI             | components/ui/*.tsx           | YES / VIOLATION     |
| Page templates      | components/templates/*.tsx    | YES / VIOLATION     |
| Shared utilities    | lib/**/*.ts                   | YES / VIOLATION     |
| Core tables (5A)    | migrations/001_*.sql          | YES / VIOLATION     |
| Extension tables    | migrations/002_*.sql          | YES / VIOLATION     |

VIOLATIONS: List any layer boundary violations and fix applied.

## ENV PLACEHOLDERS ADDED

| Variable Name              | File         | Purpose                      |
|----------------------------|--------------|------------------------------|
| RESEND_API_KEY             | .env.local   | Transactional email          |

## ISSUES FOUND AND FIXED

| Severity | File                  | Issue                    | Fix Applied              |
|----------|-----------------------|--------------------------|--------------------------|
| CRITICAL | ...                   | ...                      | ...                      |

## DEFERRED ITEMS

| Task ID | Item               | Reason Deferred          | Human Action Required    |
|---------|--------------------|--------------------------|--------------------------|
| PX.X    | ...                | ...                      | ...                      |

## REGRESSION CHECK

List any metric GREEN before this phase but now RED.
Must fix before proceeding.

## NEXT PHASE PREVIEW

Phase N+1 will work on: {name}
Expected improvements: {metrics}

## MARKET READINESS SCORE: X% (X of 15 GREEN)
```

---

## 🔁 LOOP BEHAVIOR RULES

1. READ THIS FILE IN FULL before writing a single line of code
2. BEFORE each task: read the relevant source files — never code blind
3. AFTER each task: run the specific check command for that metric
4. ON test failure: fix code, not the test (unless test is provably wrong)
5. ON build failure: STOP all other work — fix build first
6. ON missing credential: add placeholder → write code → continue
7. ON layer boundary violation: stop, refactor to correct layer, then continue
8. COMMIT after each phase:
   git add .
   git commit -m "phase({N}): {NAME} complete | coverage: X% | score: X/15 GREEN"
9. AFTER Phase 10: run full Master Scorecard
   - All 15 GREEN → write FINAL-MARKET-READY-REPORT.md → loop exits
   - Any RED → loop restarts from the phase owning the failing metric
10. NEVER skip a task — if blocked, write to BLOCKERS.md and continue

---

## ♻️ HOW TO START A NEW PLATFORM PROJECT

When this project is complete, the next project workflow is:

**Step 1 — Copy the scaffold** (5 minutes)
```bash
cp -r kaari-marketplace new-platform
cd new-platform
git init
```

**Step 2 — Change ONLY these files** (30 minutes)
```
styles/theme.css               → new brand colors, fonts, spacing
components/templates/*.tsx     → new layouts, copy, imagery slots
migrations/002_extensions.sql  → new platform-specific tables only
.env.local                     → new project env vars
CLAUDE.md → PROJECT CONTEXT    → update project name and platform type
```

**Step 3 — Run Ralph loop** on the new project
Ralph will: validate everything still compiles, run tests (all pass because
logic is identical), run scorecard, fix only the new platform's specific issues.

**Result**: New marketplace live in 2–3 days, not 2–3 weeks.

The invariant: Layer 1, 2, 3 are visual swaps.
Layer 4, 5A, 6 are copied verbatim. Never rebuild from scratch.

---

## 🚀 START SEQUENCE

Execute in this exact order:

  STEP 1 → Read this file in full
  STEP 2 → Run full Master Scorecard (all 15 metrics) — record baseline table
  STEP 3 → Calculate: Market Readiness Score = (GREEN count / 15) × 100
  STEP 4 → Verify all Layer 1–6 directories exist — scaffold any missing
  STEP 5 → Begin Phase 0, Task P0.1
  STEP 6 → Work continuously through all 10 phases
  STEP 7 → Exit when Market Readiness Score = 100%