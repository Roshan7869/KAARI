-- Ensure RLS is enabled on orders table (idempotent — safe to run if already enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to prevent conflicts on re-run
DROP POLICY IF EXISTS "users_can_view_own_orders" ON orders;
DROP POLICY IF EXISTS "users_can_insert_own_orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Admins can select all orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

-- Users can only SELECT their own orders
-- Uses ::text cast for robust comparison with Clerk user IDs (which are strings)
CREATE POLICY "users_can_view_own_orders"
  ON orders FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can insert their own orders (checkout flow)
-- The service role (used in API routes) bypasses RLS for admin operations
CREATE POLICY "users_can_insert_own_orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Admin policies: full access via has_role function
CREATE POLICY "admins_can_select_all_orders"
  ON orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_insert_orders"
  ON orders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_update_orders"
  ON orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON POLICY "users_can_view_own_orders" ON orders IS
  'Ensures users can only read their own order records. '
  'Service role bypasses this for admin and webhook operations.';

-- Also ensure RLS on other sensitive tables that may not have it
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashfree_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

-- Checkout sessions: users can only see their own
DROP POLICY IF EXISTS "users_can_view_own_checkout_sessions" ON checkout_sessions;
CREATE POLICY "users_can_view_own_checkout_sessions"
  ON checkout_sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Payment sessions: users can only see their own
DROP POLICY IF EXISTS "users_can_view_own_payment_sessions" ON payment_sessions;
CREATE POLICY "users_can_view_own_payment_sessions"
  ON payment_sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);