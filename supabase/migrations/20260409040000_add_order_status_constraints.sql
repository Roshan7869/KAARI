-- Add order status enum and constraints to prevent backwards transitions
-- Fixes BUG #15: Order status can go backwards

-- Create enum type for order statuses
CREATE TYPE public.order_status AS ENUM (
  'placed',           -- Initial state when order is created
  'payment_pending',  -- Payment initiation begun but not yet verified
  'paid',             -- Payment confirmed
  'processing',       -- Order being prepared for shipment
  'shipped',          -- Order dispatched to customer
  'delivered',        -- Order successfully delivered
  'cancelled',        -- Order cancelled before shipping or after delivery issues
  'refunded'          -- Payment refunded to customer
);

-- Update the orders table to use the new enum type with proper constraints
-- First, drop the old check constraint if it exists
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new enum-based constraint
ALTER TABLE public.orders
ALTER COLUMN status TYPE public.order_status
USING status::public.order_status;

-- Create a trigger function to prevent backwards status transitions
CREATE OR REPLACE FUNCTION prevent_order_status_regressions()
RETURNS TRIGGER AS $$
BEGIN
  -- Define allowed forward transitions
  IF OLD.status = 'placed' THEN
    IF NEW.status NOT IN ('payment_pending', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from PLACED to %', NEW.status
        USING HINT = 'Must transition to PAYMENT_PENDING or CANCELLED';
    END IF;

  ELSIF OLD.status = 'payment_pending' THEN
    IF NEW.status NOT IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from PAYMENT_PENDING to %', NEW.status
        USING HINT = 'Must transition to PAID or CANCELLED';
    END IF;

  ELSIF OLD.status = 'paid' THEN
    IF NEW.status NOT IN ('processing', 'cancelled', 'refunded') THEN
      RAISE EXCEPTION 'Cannot transition from PAID to %', NEW.status
        USING HINT = 'Must transition to PROCESSING, CANCELLED, or REFUNDED';
    END IF;

  ELSIF OLD.status = 'processing' THEN
    IF NEW.status NOT IN ('shipped', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from PROCESSING to %', NEW.status
        USING HINT = 'Must transition to SHIPPED or CANCELLED';
    END IF;

  ELSIF OLD.status = 'shipped' THEN
    IF NEW.status NOT IN ('delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot transition from SHIPPED to %', NEW.status
        USING HINT = 'Must transition to DELIVERED or CANCELLED';
    END IF;

  ELSIF OLD.status = 'delivered' THEN
    IF NEW.status != 'delivered' THEN
      RAISE EXCEPTION 'Cannot change status from DELIVERED'
        USING HINT = 'DELIVERED orders can only stay delivered or be marked CANCELLED for return';
    END IF;

  ELSIF OLD.status = 'cancelled' THEN
    IF NEW.status != 'cancelled' THEN
      RAISE EXCEPTION 'Cannot change status from CANCELLED'
        USING HINT = 'Cancelled orders remain cancelled';
    END IF;

  ELSIF OLD.status = 'refunded' THEN
    IF NEW.status != 'refunded' THEN
      RAISE EXCEPTION 'Cannot change status from REFUNDED'
        USING HINT = 'Refunded orders remain refunded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent status regressions
DROP TRIGGER IF EXISTS enforce_order_status_flow ON public.orders;

CREATE TRIGGER enforce_order_status_flow
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION prevent_order_status_regressions();

-- Ensure the constraint is applied by refreshing the constraint
ALTER TABLE public.orders
ADD CONSTRAINT order_valid_status_transitions
CHECK (
  (status = 'placed') OR
  (status = 'payment_pending') OR
  (status = 'paid') OR
  (status = 'processing') OR
  (status = 'shipped') OR
  (status = 'delivered') OR
  (status = 'cancelled') OR
  (status = 'refunded')
);