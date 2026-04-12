-- ============================================================
-- Fix product_type CHECK constraint
-- The original schema only allowed ('ready_made', 'made_to_order', 'custom_request')
-- but the Zod schemas and AdminProductForm use ('standard', 'customized').
-- This migration drops the old constraint and adds a new one that accepts
-- both old and new values for backward compatibility.
-- ============================================================

-- Drop the old constraint (name from the initial schema)
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Also try the auto-generated name pattern
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_product_type_check1;

-- Add the new constraint accepting both old and new values
ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('ready_made', 'made_to_order', 'custom_request', 'standard', 'customized'));

-- Migrate existing data: map old values to new canonical values
UPDATE public.products SET product_type = 'standard' WHERE product_type = 'ready_made';
UPDATE public.products SET product_type = 'customized' WHERE product_type IN ('made_to_order', 'custom_request');

-- After migration, tighten the constraint to only accept the new values
ALTER TABLE public.products
  DROP CONSTRAINT products_product_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'customized'));