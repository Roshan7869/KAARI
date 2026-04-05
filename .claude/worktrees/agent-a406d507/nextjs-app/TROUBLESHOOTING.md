# Kaari Marketplace Troubleshooting Guide

## Common Issues & Solutions

### 🔴 Development Server Issues

#### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or run on different port
npm run dev -- -p 3001
```

---

#### Issue: "Module not found: '@/...'`
**Solution:**
1. Check `tsconfig.json` has correct path mapping:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. Restart dev server
3. Run `npm install` to sync node_modules

---

#### Issue: Styles not loading
**Solution:**
1. Ensure `globals.css` is imported in `app/layout.tsx`
2. Check Tailwind config exists: `tailwind.config.ts`
3. Verify `postcss.config.mjs` exists
4. Restart dev server

---

### 🔵 Authentication Issues

#### Issue: "NEXT_PUBLIC_SUPABASE_URL is required"
**Solution:**

1. Create `.env.local` in `nextjs-app/` directory (NOT root):
```bash
cp .env.local.example .env.local
```

2. Fill in Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-project-id
```

3. Restart dev server
4. Verify file location: `nextjs-app/.env.local`

---

#### Issue: "Session is null" / Not logged in
**Solution:**

1. Check Supabase project is active:
   - Visit Supabase dashboard
   - Verify project status

2. Verify auth credentials work:
```bash
# Test in browser console
supabase.auth.getSession()
```

3. Check cookies are enabled in browser

4. Clear browser cache and cookies

---

#### Issue: Admin role not working
**Solution:**

1. Grant admin role in Supabase:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin');
```

2. Find your user ID:
```sql
SELECT id, email FROM auth.users LIMIT 5;
```

3. Verify in app:
```bash
# In browser console
await supabase.rpc('has_role', {
  _role: 'admin',
  _user_id: 'your-uuid'
})
```

4. Sign out and back in for changes to take effect

---

### 🟢 API & Database Issues

#### Issue: "Failed to add to cart" / 500 error
**Solution:**

1. Check product exists:
```sql
SELECT * FROM products WHERE id = 'your-id';
```

2. Check product_variants exist and have stock:
```sql
SELECT * FROM product_variants WHERE product_id = 'your-id';
```

3. Verify stock quantity > 0

4. Check cart_items table permissions:
```sql
SELECT * FROM carts WHERE user_id = 'your-id';
```

---

#### Issue: "No active cart"
**Solution:**

1. Create cart explicitly:
```typescript
const { data: cart } = await supabase
  .from('carts')
  .insert({ user_id: userId, status: 'active', currency: 'INR' })
  .select()
  .single();
```

2. Check user_id is correct

3. Verify RLS policies allow cart creation

---

#### Issue: Checkout fails / "Order creation error"
**Solution:**

1. Verify all required fields:
   - firstName, lastName, email, phone
   - address, city, state, zipCode

2. Check cart has items:
```sql
SELECT * FROM cart_items WHERE cart_id = 'your-cart-id';
```

3. Verify `create_order_from_cart` RPC exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'create_order_from_cart';
```

4. Check order_items table is not full (quota)

---

### 🟡 Build & Deployment Issues

#### Issue: Build fails with TypeScript errors
**Solution:**

1. Type-check locally first:
```bash
npm run type-check
```

2. Fix TypeScript errors:
```bash
npm run lint
```

3. Common fixes:
   - Add type annotations to variables
   - Import types correctly: `import type { Foo } from '...'`
   - Check null/undefined handling

---

#### Issue: Next.js build OOM (out of memory)
**Solution:**

```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Or use turbopack (experimental, faster):
next build --experimental-turbo
```

---

#### Issue: Deployment to Vercel fails
**Solution:**

1. Check build logs in Vercel dashboard
2. Verify all environment variables set:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - etc.
3. Ensure `.gitignore` doesn't exclude needed files
4. Try deploying to different branch first

---

### 🟠 Performance Issues

#### Issue: React Three Fiber (3D) not rendering
**Solution:**

1. Check WebGL support:
```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
console.log('WebGL supported:', !!gl);
```

2. Verify 3D component uses dynamic import:
```typescript
const YarnBall3D = dynamic(
  () => import('./YarnBall3D'),
  { ssr: false }
);
```

3. Try different browser (Chrome/Firefox recommended)

---

#### Issue: Slow API responses
**Solution:**

1. Check database query performance:
```sql
EXPLAIN ANALYZE SELECT * FROM products LIMIT 10;
```

2. Add indexes to frequently queried columns:
```sql
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

3. Check for N+1 queries:
   - Use JOINs instead of multiple queries
   - Use `.select()` with proper relations

4. Enable Supabase query cache

---

#### Issue: Large bundle size
**Solution:**

1. Analyze bundle:
```bash
npm run build -- --analyze
```

2. Remove unused dependencies:
```bash
npm audit  # Check for unused packages
npm prune
```

3. Use dynamic imports for heavy components:
```typescript
const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  { loading: () => <Skeleton /> }
);
```

---

### 🔶 Email & Notifications

#### Issue: Emails not sending
**Solution:**

1. Email service not configured (expected):
   - Email service is placeholder
   - To enable: integrate Resend, SendGrid, or Mailgun
   - Add API keys to environment variables

2. Check email service credentials in production env

3. Verify email template syntax

---

### 🟣 Testing Issues

#### Issue: Tests failing with "matchMedia is not defined"
**Solution:**

1. Check `vitest.setup.ts` has matchMedia mock:
```typescript
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    // ... rest of mock
  })),
});
```

2. Verify setup file is referenced in `vitest.config.ts`

3. Run tests with proper environment:
```bash
npm run test  # Uses jsdom environment
```

---

#### Issue: E2E tests timeout
**Solution:**

1. Increase timeout in `playwright.config.ts`:
```typescript
use: {
  timeout: 30000, // 30 seconds
}
```

2. Ensure app is running:
```bash
npm run dev  # Run in separate terminal
npm run e2e
```

3. Check headless mode:
```bash
npx playwright test --headed  # See browser
```

---

## Debug Mode

### Enable Debug Logging

```typescript
// In your component
import { logger } from '@/lib/logger';

logger.debug('Debug info:', { data });
logger.info('App started');
logger.warn('Warning message');
logger.error('Error occurred:', error);
```

### Check Environment

```bash
# Print all env vars
node -e "console.log(process.env)"

# Check Node version
node --version

# Check npm version
npm --version
```

---

## Getting Help

### Resources
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Tailwind**: https://tailwindcss.com/docs

### Debug Steps
1. Check browser console for errors
2. Check server terminal for logs
3. Check Supabase dashboard for data issues
4. Run `npm run type-check` for TypeScript errors
5. Clear cache: `npm run clean`

### Report Issues
When reporting bugs include:
- Error message (full stack trace)
- Steps to reproduce
- Environment (Node version, OS, browser)
- Relevant code snippet
- Screenshot if visual issue

---

**Last Updated**: March 22, 2026
**Status**: ✅ Production Ready
