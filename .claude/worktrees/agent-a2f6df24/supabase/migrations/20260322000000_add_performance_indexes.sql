-- Add performance indexes to critical tables for faster queries
-- This migration addresses slow query performance on cart, product, and order operations

-- Cart table indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_status 
ON public.carts(user_id, status) 
WHERE status = 'active';

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart
ON public.cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product
ON public.cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_variant
ON public.cart_items(variant_id);

-- Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product
ON public.product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_stock
ON public.product_variants(product_id, stock_qty);

-- Products indexes  
CREATE INDEX IF NOT EXISTS idx_products_slug
ON public.products(slug);

CREATE INDEX IF NOT EXISTS idx_products_category
ON public.products(category);

CREATE INDEX IF NOT EXISTS idx_products_active
ON public.products(is_active);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user
ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created
ON public.orders(created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order
ON public.order_items(order_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_order
ON public.payments(order_id);

-- Checkout sessions indexes
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user
ON public.checkout_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status
ON public.checkout_sessions(status);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
ON public.user_roles(user_id, role);
