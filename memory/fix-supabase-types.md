---
name: Supabase Type Fixes
description: Fixed TypeScript type issues with Supabase client and Database schema integration
type: project
---

## Supabase Type Fix Summary (Mar 31, 2026)

### Files Fixed

1. **lib/supabase/client.ts**
   - Added explicit type annotation `SupabaseClient<Database>` to the client
   - Simplified code by removing unnecessary wrapper function

2. **lib/supabase/declare.d.ts**
   - Removed `as any` type assertions from module augmentation

3. **app/account/settings/page.tsx**
   - Removed `as any` from supabase client usage on line 42

4. **app/api/admin/products/route.ts**
   - Removed `as any` from product insert on line 88
   - Removed `as any` from product update on line 138

5. **app/api/auth/login/route.ts**
   - Removed `as any` from profile insert on line 67

6. **app/api/auth/me/route.ts**
   - Removed `as any` from profile update on line 100

7. **app/api/auth/signup/route.ts**
   - Removed `as any` from profile insert on line 82

8. **app/api/cart/items/[id]/route.ts**
   - Removed `as any` from select query on line 46
   - Fixed variant price type assertion from `as any` to proper cast
   - Removed `as any` from cart item update on line 89

9. **app/contexts/CartContext.tsx**
   - Added `useRef` for `isMountedRef` to avoid useEffect dependency churn
   - Changed `refreshCart` useCallback to use ref instead of state for mount check
   - Fixed dependency array to not include `mounted` state

10. **app/contexts/AuthContext.tsx**
    - Fixed profile insert to not include `email` column that doesn't exist in schema
    - Changed insert from `{ id, email, full_name }` to `{ id, full_name }`

### Root Cause

The main issue was that the Supabase client was not properly typed with the Database schema from `types/database.ts`. The `@supabase/ssr` package's type inference wasn't correctly passing through the Database generic type, causing insert/update operations to fail type checking.

### Resolution

- Explicitly typed the Supabase client with `SupabaseClient<Database>` 
- Removed unnecessary `as any` type assertions
- Used proper type definitions from `@/types/database` where available

### Verification

- TypeScript type check passes with `npx tsc --noEmit`
- ESLint passes on all modified files
- No ESLint errors related to `@typescript-eslint/no-explicit-any`
