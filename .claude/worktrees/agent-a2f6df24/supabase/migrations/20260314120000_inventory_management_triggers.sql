-- Inventory Management & Payment Failure Recovery
-- Adds triggers and functions for automatic inventory restoration and order cleanup

-- Add payment tracking columns to payments table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'external_transaction_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN external_transaction_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN failure_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN retry_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'last_retry_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN last_retry_at timestamptz;
  END IF;
END $$;

-- Create function to restore inventory when payment fails
CREATE OR REPLACE FUNCTION public.restore_inventory_on_payment_failure()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id uuid;
  v_item RECORD;
BEGIN
  -- Only process when payment transitions to 'failed' or 'cancelled'
  IF (NEW.status IN ('failed', 'cancelled') AND 
      OLD.status NOT IN ('failed', 'cancelled')) THEN
    
    -- Get the order ID
    v_order_id := NEW.order_id;
    
    -- Restore stock for each item in the order
    FOR v_item IN
      SELECT oi.variant_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = v_order_id
    LOOP
      UPDATE public.product_variants
      SET stock_qty = stock_qty + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.variant_id;
    END LOOP;
    
    -- Update order status to cancelled
    UPDATE public.orders
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = v_order_id
      AND status IN ('payment_pending', 'awaiting_review');
    
    -- Log this restoration
    INSERT INTO public.order_status_events (order_id, status, notes)
    VALUES (v_order_id, 'cancelled', 'Inventory restored due to payment failure');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS tr_restore_inventory_on_payment_fail ON public.payments;

-- Create trigger for payment failure
CREATE TRIGGER tr_restore_inventory_on_payment_fail
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_payment_failure();

-- Create function to also trigger on payment insert with failed status
CREATE OR REPLACE FUNCTION public.handle_payment_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment created with failed status, restore inventory immediately
  IF NEW.status = 'failed' THEN
    PERFORM public.restore_inventory_on_payment_failure()
      USING NEW, NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_payment_insert_failed ON public.payments;
CREATE TRIGGER tr_payment_insert_failed
  AFTER INSERT ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'failed')
  EXECUTE FUNCTION public.handle_payment_insert();

-- Create function to clean up stale orders (pending payment > 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_stale_orders()
RETURNS TABLE(cleaned_orders_count int, restored_items_count int) AS $$
DECLARE
  v_cleaned int := 0;
  v_restored int := 0;
  v_order_id uuid;
  v_item RECORD;
BEGIN
  -- Find all orders stuck in payment_pending for > 24 hours
  FOR v_order_id IN
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'payment_pending'
      AND o.payment_status = 'initiated'
      AND o.created_at < now() - INTERVAL '24 hours'
    FOR UPDATE
  LOOP
    -- Restore inventory for each item
    FOR v_item IN
      SELECT variant_id, quantity
      FROM public.order_items
      WHERE order_id = v_order_id
    LOOP
      UPDATE public.product_variants
      SET stock_qty = stock_qty + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.variant_id;
      
      v_restored := v_restored + 1;
    END LOOP;
    
    -- Cancel the order
    UPDATE public.orders
    SET status = 'cancelled',
        payment_status = 'cancelled',
        updated_at = now()
    WHERE id = v_order_id;
    
    -- Log the cancellation
    INSERT INTO public.order_status_events (order_id, status, notes)
    VALUES (v_order_id, 'cancelled', 'Auto-cancelled due to payment timeout (>24hrs)');
    
    v_cleaned := v_cleaned + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_cleaned, v_restored;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup stale checkout sessions (not converted in 30 mins)
CREATE OR REPLACE FUNCTION public.cleanup_stale_checkout_sessions()
RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_session_id uuid;
BEGIN
  -- Find all checkout sessions not completed/converted in 30 minutes
  v_count := (
    SELECT COUNT(*)
    FROM public.checkout_sessions cs
    WHERE cs.status IN ('draft', 'payment_pending')
      AND cs.created_at < now() - INTERVAL '30 minutes'
  );
  
  -- Mark them as abandoned (don't delete in case of audit needs)
  UPDATE public.checkout_sessions
  SET status = 'abandoned',
      updated_at = now()
  WHERE status IN ('draft', 'payment_pending')
    AND created_at < now() - INTERVAL '30 minutes';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster lookups in cleanup functions
CREATE INDEX IF NOT EXISTS idx_orders_payment_pending_timeout
  ON public.orders (created_at)
  WHERE status = 'payment_pending' AND payment_status = 'initiated';

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_abandoned
  ON public.checkout_sessions (created_at)
  WHERE status IN ('draft', 'payment_pending');

CREATE INDEX IF NOT EXISTS idx_payments_external_txn
  ON public.payments (external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- Grant necessary permissions
REVOKE ALL ON FUNCTION public.restore_inventory_on_payment_failure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_inventory_on_payment_failure() TO authenticated;

REVOKE ALL ON FUNCTION public.cleanup_stale_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_orders() TO authenticated;

REVOKE ALL ON FUNCTION public.cleanup_stale_checkout_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_checkout_sessions() TO authenticated;
