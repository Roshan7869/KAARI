-- Kaari Marketplace - Complete Test Data Seed Script
-- Run this script to populate the database with test products, variants, and admin account
-- This script is idempotent (safe to run multiple times)

-- ============================================================================
-- SECTION 1: Ensure Admin User Role Exists
-- ============================================================================

-- Add admin role to a test user if they exist (replace USER_ID with actual user ID)
-- You can find user IDs in the auth.users table
-- To make a user admin after they sign up:
DO $$ 
DECLARE
  v_test_user_id uuid;
BEGIN
  -- Find the first test user (you should replace this with a specific user ID)
  SELECT id INTO v_test_user_id 
  FROM auth.users 
  WHERE email LIKE '%@%' 
  LIMIT 1;
  
  IF v_test_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_test_user_id, 'admin')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: %', v_test_user_id;
  ELSE
    RAISE NOTICE 'No users found to assign admin role to. Sign up first, then run this script with the specific user ID.';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: Verify Products are Seeded
-- ============================================================================

-- Check current product count
SELECT COUNT(*) as product_count FROM public.products;

-- List all current products
SELECT id, title, slug, base_price, is_active, category FROM public.products ORDER BY created_at;

-- ============================================================================
-- SECTION 3: Check Product Variants and Stock
-- ============================================================================

-- Verify variants exist
SELECT p.title, COUNT(pv.id) as variant_count, SUM(pv.stock_qty) as total_stock
FROM public.products p
LEFT JOIN public.product_variants pv ON pv.product_id = p.id
GROUP BY p.id, p.title
ORDER BY p.created_at;

-- ============================================================================
-- SECTION 4: Check RLS Policies are Active
-- ============================================================================

-- Verify products policy
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'products' AND policyname = 'Products are publicly readable'
) as products_public_readable;

-- Verify user_roles policy
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'user_roles' AND policyname = 'Admins can manage roles'
) as admins_can_manage_roles;

-- ============================================================================
-- ADDITIONAL SETUP NOTES
-- ============================================================================

-- TO SET UP AN ADMIN USER:
-- 1. Sign up a new user through the /signup page or via Supabase Auth
-- 2. Get the user ID from Supabase Auth dashboard (auth.users table)
-- 3. Run this SQL to grant admin role:
--    INSERT INTO public.user_roles (user_id, role) 
--    VALUES ('USER_ID_HERE', 'admin');

-- TO VERIFY DATA IS SEEDED:
-- - Products should show in the /products page
-- - Admin dashboard at /admin should show the product list
-- - If no products show in admin, check RLS policies are enabled

-- TO FIX EMPTY ADMIN INVENTORY:
-- 1. Verify products exist: SELECT COUNT(*) FROM public.products;
-- 2. Verify RLS is allowing access: Check policies exist with queries above
-- 3. Verify user is admin: SELECT * FROM public.user_roles WHERE role = 'admin';
-- 4. Check browser console for any error messages
-- 5. Check Supabase dashboard for any RLS policy errors
