-- Queue order confirmation notifications when an order is created.

CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_phone text;
BEGIN
  SELECT u.email, p.full_name, p.phone
  INTO v_email, v_full_name, v_phone
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = NEW.user_id;

  IF v_email IS NOT NULL THEN
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_confirmation',
      'email',
      v_email,
      format('Your Kaari Order #%s has been placed!', NEW.order_number),
      format(
        'Hello %s, your order #%s has been placed successfully. Total: ₹%s.',
        COALESCE(v_full_name, 'Customer'),
        NEW.order_number,
        NEW.total_amount
      ),
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'total_amount', NEW.total_amount,
        'payment_status', NEW.payment_status
      )
    );
  END IF;

  IF v_phone IS NOT NULL THEN
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_confirmation',
      'sms',
      v_phone,
      NULL,
      format('Kaari: Order #%s confirmed! Total ₹%s.', NEW.order_number, NEW.total_amount),
      NEW.id,
      jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_created_notifications ON public.orders;
CREATE TRIGGER tr_order_created_notifications
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_created();
