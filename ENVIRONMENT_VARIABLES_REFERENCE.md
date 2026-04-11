# Environment Variables Reference

## Overview
Kaari Marketplace requires environment variables for different third-party services. This guide explains which variables are needed and how they're used.

---

## Variable Categories

### 🔐 Security Rules

**NEVER expose to client (server-side only):**
- `SUPABASE_SERVICE_ROLE_KEY` - Full admin access to Supabase
- `CLOUDINARY_API_SECRET` - Secret for admin image operations
- `CASHFREE_SECRET_KEY` - Payment processing secret
- `RESEND_API_KEY` - Email service API key

**Safe to expose (public keys):**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Limited by RLS policies
- `NEXT_PUBLIC_CLOUDINARY_API_KEY` - Upload only, cannot delete
- `NEXT_PUBLIC_CASHFREE_MODE` - Sandbox/production mode only

---

## Environment Variables by Feature

### 1. **Authentication & Database (Supabase)**

```
NEXT_PUBLIC_SUPABASE_URL=[HIDDEN_SECRET]
NEXT_PUBLIC_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY              # Public (safe)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY          # Server-side only ⚠️
```

**What it does:**
- User login & authentication
- Review data storage & RLS access control
- Customization uploads storage
- Order management

**Where to get:**
- Go to: `app.supabase.com` → `Settings` → `API`
- Anon Key: Copy from "anon public key"
- Service Role Key: Copy from "service_role key"

**RLS (Row-Level Security):**
- Anon key has limited permissions (customers only see their own + approved visible data)
- Service Role key has full admin access (used in Edge Functions only)

---

### 2. **Product Image Management (Cloudinary)**

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY=YOUR_API_KEY              # Public (safe)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=[HIDDEN_SECRET]
CLOUDINARY_API_KEY=YOUR_API_KEY                          # Duplicate for server
CLOUDINARY_API_SECRET=YOUR_API_SECRET                    # Server-side only ⚠️
```

**What it does:**
- Admin uploads product images
- Auto-resizing and optimization
- CDN delivery

**Access Control:**
- Admin ONLY: Uses `CLOUDINARY_API_SECRET`
- Customers: Read-only (see public URLs)
- Reviews: No image uploads (uses Supabase Storage instead)

**Where to get:**
- Go to: `console.cloudinary.com` → `Settings` → `Access Keys`

**Rotation:**
- If exposed: Go to `Settings` → `Regenerate Access Keys`

---

### 3. **Payment Processing (Cashfree)**

```
CASHFREE_APP_ID=YOUR_CASHFREE_APP_ID
CASHFREE_SECRET_KEY=YOUR_SECRET_KEY                      # Server-side only ⚠️
CASHFREE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
CASHFREE_TEST_MODE=true                                  # Set to false in production
NEXT_PUBLIC_CASHFREE_MODE=sandbox                        # Safe for client
```

**What it does:**
- Payment gateway for orders
- Payment verification & webhooks
- COD (Cash on Delivery) support

**Where to get:**
- Go to: `merchant.cashfree.com` → `Developers` → `API Keys`

**Security:**
- All payment operations happen server-side (Edge Functions)
- Client only knows if payment succeeded/failed

---

### 4. **Email Notifications (Resend)**

```
RESEND_API_KEY=[HIDDEN_SECRET]                    # Server-side only ⚠️
NOTIFICATIONS_FROM_EMAIL=[HIDDEN_SECRET]
```

**What it does:**
- Order confirmation emails
- Payment status notifications
- Account recovery emails

**Where to get:**
- Go to: `resend.com` → `Dashboard` → `API Keys`

---

### 5. **Rate Limiting & Caching (Upstash Redis)**

```
UPSTASH_REDIS_REST_URL=[HIDDEN_SECRET]
UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN                      # Server-side only ⚠️
```

**What it does:**
- Server-side rate limiting (login, checkout, payment)
- Session caching
- Request throttling

**Where to get:**
- Go to: `console.upstash.com` → Select your DB → `REST API`

---

### 6. **URL Configuration**

```
NEXT_PUBLIC_APP_URL=http://localhost:3000                # Local dev
KAARI_BASE_URL=[HIDDEN_SECRET]     # Production
NEXT_PUBLIC_CASHFREE_TEST_MODE=true                      # or false
```

**What it does:**
- Webhook callbacks
- Email links (order confirmation, reviews, etc.)
- OAuth redirects

---

### 7. **Admin Features**

**No additional environment variables needed!**

Features included:
- ✅ Review management dashboard (/admin/reviews)
- ✅ Customize approval workflow (pending → approve/reject)
- ✅ Toggle review visibility anytime
- ✅ Feature top reviews with priority
- ✅ Search & filter reviews (by product, customer, rating, date)
- ✅ Immutable audit trail (track all changes)
- ✅ Customization request management
- ✅ Inspiration image uploads (Supabase Storage bucket: customization-uploads)

**Access Control:**
- Requires `admin` role in `user_roles` table
- All access controlled by RLS policies
- All actions logged with admin ID + timestamp

---

## Setup Checklist

### Development (.env.local)

```bash
# 1. Copy template
cp .env.example .env.local

# 2. Fill in your values from:
# ✓ Supabase dashboard
# ✓ Cloudinary console
# ✓ Cashfree merchant dashboard
# ✓ Resend dashboard
# ✓ Upstash console

# 3. Never commit .env.local
# (Already in .gitignore)

# 4. Test locally
npm run dev
```

### Production (Vercel Deployment)

```bash
# 1. Go to: Vercel → Project → Settings → Environment Variables

# 2. Add all variables from .vercel.production.env:
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CASHFREE_APP_ID
CASHFREE_SECRET_KEY
... and others

# 3. For each variable, set Environment:
# - "Production" for main deployment
# - "Preview" for PR previews
# - "Development" for local

# 4. Redeploy:
# Vercel automatically picks up new env vars
```

---

## Common Issues

### Problem: "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"

**Solution:**
1. Check Vercel → Settings → Environment Variables
2. Verify variable is set and not empty
3. Check key is production key (not anon key)
4. Redeploy after adding

### Problem: Reviews not showing in admin dashboard

**Solution:**
1. Verify you have admin role:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'your_id' AND role = 'admin';
   ```
2. Check `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check RLS policies exist on `review_visibility` table

### Problem: Cloudinary image upload failing

**Solution:**
1. Check `CLOUDINARY_API_KEY` vs `CLOUDINARY_API_SECRET`
2. Upload preset must match: `[HIDDEN_SECRET]`
3. Verify signature validation in Edge Function
4. Check Cloudinary upload limits

---

## Variable Values Summary

| Variable | Where From | Type | Exposed to Client? |
|----------|-----------|------|-------------------|
| SUPABASE_URL | supabase.com | URL | ✓ Yes (PUBLIC_prefix) |
| SUPABASE_ANON_KEY | supabase.com | Key | ✓ Yes (PUBLIC_prefix) |
| SUPABASE_SERVICE_ROLE_KEY | supabase.com | Key | ✗ No (server-side) |
| CLOUDINARY_CLOUD_NAME | cloudinary.com | Name | ✓ Yes (PUBLIC_prefix) |
| CLOUDINARY_API_KEY | cloudinary.com | Key | ✓ Yes (both public & server) |
| CLOUDINARY_API_SECRET | cloudinary.com | Secret | ✗ No (server-side only) |
| CASHFREE_APP_ID | cashfree.com | ID | ✓ Yes (handed to SDK) |
| CASHFREE_SECRET_KEY | cashfree.com | Secret | ✗ No (server-side) |
| RESEND_API_KEY | resend.com | Key | ✗ No (server-side) |
| UPSTASH_TOKEN | upstash.com | Token | ✗ No (server-side) |

---

## For Developers: How to Add New Variables

### Step 1: Identify if server-side only
```
If secret/sensitive key → Don't use NEXT_PUBLIC_ prefix
If safe to expose → Use NEXT_PUBLIC_ prefix
```

### Step 2: Update .env.example
```bash
# Add to .env.example with clear description
NEW_VAR=your_placeholder_value   # Description of what this does
```

### Step 3: Update .vercel.production.env
```bash
# Add to Vercel env file with same format
NEW_VAR=your_placeholder_value
```

### Step 4: Use in code
```typescript
// Safe to import in server-side code
const key = process.env.NEW_VAR;

// For client-side, must have NEXT_PUBLIC_ prefix
const publicKey = process.env.NEXT_PUBLIC_NEW_VAR;
```

### Step 5: Set in Vercel
```
Vercel Dashboard → Settings → Environment Variables → Add new variable
```

---

## Security Best Practices

✅ **DO:**
- Never commit .env.local to git
- Rotate keys if exposed in git history
- Use different keys for dev vs production
- Store secrets in Vercel/environment only
- Review which variables actually need to be public

❌ **DON'T:**
- Expose secret keys to client (use NEXT_PUBLIC_ only for safe values)
- Share env files in team chat/email
- Use same keys across environments
- Leave placeholder values in production
- Commit .env.production.env to public repos

---

## References

- Env Setup: `.env.example` (template for local dev)
- Production: `.vercel.production.env` (Vercel snapshot)
- Docs: See individual feature documentation files

**Questions?** Check the specific feature guide (review management, payment, etc.)
