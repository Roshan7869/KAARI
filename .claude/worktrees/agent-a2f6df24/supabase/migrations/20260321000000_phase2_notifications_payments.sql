-- Phase 2: Notifications and Payment Gateway Infrastructure
-- Adds support for Cashfree payments, email/SMS notifications, and order tracking

-- ============================================================================
-- 1. NOTIFICATION PREFERENCES (add to profiles)
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails_enabled boolean DEFAULT false;

-- ============================================================================
-- 2. NOTIFICATIONS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'order_confirmation',
    'payment_success',
    'payment_failed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'custom_quote_approved',
    'custom_quote_rejected',
    'verification',
    'marketing'
  )),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  recipient text NOT NULL, -- email address or phone number
  subject text,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb, -- additional data like order details, tracking numbers, etc.
  provider_response jsonb, -- response from email/sms provider
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_order ON public.notifications(order_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at);

-- ============================================================================
-- 3. PAYMENT GATEWAY CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('cashfree', 'razorpay', 'stripe', 'dummy')),
  is_active boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  api_key text, -- encrypted in production
  api_secret text, -- encrypted in production
  webhook_secret text, -- for signature validation
  config jsonb DEFAULT '{}'::jsonb, -- additional provider-specific config
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT single_active_gateway UNIQUE (provider) WHERE is_active = true
);

-- Only one gateway can be active at a time for each provider
CREATE INDEX idx_payment_gateways_active ON public.payment_gateways(provider) WHERE is_active = true;

-- ============================================================================
-- 4. CASHFREE PAYMENT SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cashfree_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,

  -- Cashfree specific fields
  cf_order_id text, -- Cashfree's order ID
  cf_payment_session_id text UNIQUE, -- Cashfree payment session ID
  cf_payment_id text, -- Cashfree payment ID after completion

  -- Payment details
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'INR',
  payment_method text, -- upi, card, netbanking, wallet, cod

  -- Status tracking
  status text DEFAULT 'created' CHECK (status IN (
    'created',      -- Session created, awaiting payment
    'active',       -- Payment initiated by user
    'paid',         -- Payment successful
    'failed',       -- Payment failed
    'cancelled',    -- Payment cancelled
    'expired'       -- Session expired
  )),

  -- Meta information
  customer_email text,
  customer_phone text,
  customer_name text,
  return_url text,
  notify_url text, -- Webhook URL for Cashfree

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 minutes'),
  paid_at timestamptz,

  -- Raw response from Cashfree
  raw_response jsonb
);

CREATE INDEX idx_cashfree_sessions_order ON public.cashfree_sessions(order_id);
CREATE INDEX idx_cashfree_sessions_cf_payment ON public.cashfree_sessions(cf_payment_session_id);
CREATE INDEX idx_cashfree_sessions_status ON public.cashfree_sessions(status);
CREATE INDEX idx_cashfree_sessions_expires ON public.cashfree_sessions(expires_at);

-- ============================================================================
-- 5. ORDER TRACKING (SHIPMENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Shipping partner details
  carrier text NOT NULL, -- e.g., 'Delhivery', 'BlueDart', 'India Post'
  tracking_number text,
  tracking_url text,

  -- Shipping status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting to be shipped
    'shipped',      -- Handed to carrier
    'in_transit',   -- In transit
    'out_for_delivery', -- Out for delivery
    'delivered',    -- Delivered successfully
    'failed_delivery', -- Delivery attempt failed
    'returned'      -- Returned to sender
  )),

  -- Timeline
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery timestamptz,

  -- Address snapshot (at time of shipping)
  shipping_address jsonb NOT NULL,

  -- Weight and dimensions for shipping cost calculation
  weight_kg numeric(6,3),
  dimensions_cm jsonb, -- {length, width, height}

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shipments_order ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_number);
CREATE INDEX idx_shipments_status ON public.shipments(status);

-- ============================================================================
-- 6. SHIPMENT TRACKING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  -- Event details
  status text NOT NULL, -- 'picked_up', 'in_transit', 'reached_hub', etc.
  location text,
  description text NOT NULL,

  -- Timestamps
  event_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Raw data from carrier
  raw_data jsonb
);

CREATE INDEX idx_shipment_events_shipment ON public.shipment_events(shipment_id);
CREATE INDEX idx_shipment_events_at ON public.shipment_events(event_at);

-- ============================================================================
-- 7. EMAIL/SMS TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN (
    'order_confirmation',
    'payment_success',
    'payment_failed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'custom_quote_approved',
    'custom_quote_rejected',
    'verification',
    'marketing'
  )),
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  subject text, -- For emails
  template text NOT NULL, -- Template with {{variable}} placeholders
  variables text[] DEFAULT '{}', -- List of variables used in template
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default templates
INSERT INTO public.notification_templates (name, type, channel, subject, template, variables) VALUES
-- Email templates
('order_confirmation_email', 'order_confirmation', 'email',
  'Your Kaari Order #{{order_number}} has been placed!',
  'Dear {{customer_name}},\n\nThank you for your order!\n\nOrder Details:\nOrder Number: {{order_number}}\nTotal Amount: ₹{{total_amount}}\nPayment Method: {{payment_method}}\n\nItems:\n{{#each items}}\n- {{name}} x {{quantity}} - ₹{{price}}\n{{/each}}\n\nWe''ll notify you when your order ships.\n\nBest regards,\nKaari Team',
  ARRAY['customer_name', 'order_number', 'total_amount', 'payment_method', 'items']),

('payment_success_email', 'payment_success', 'email',
  'Payment Successful - Order #{{order_number}}',
  'Dear {{customer_name}},\n\nYour payment of ₹{{amount}} for Order #{{order_number}} has been successfully processed.\n\nTransaction ID: {{transaction_id}}\nPayment Method: {{payment_method}}\n\nYour order is now being prepared.\n\nBest regards,\nKaari Team',
  ARRAY['customer_name', 'order_number', 'amount', 'transaction_id', 'payment_method']),

('payment_failed_email', 'payment_failed', 'email',
  'Payment Failed - Order #{{order_number}}',
  'Dear {{customer_name}},\n\nUnfortunately, your payment for Order #{{order_number}} could not be processed.\n\nAmount: ₹{{amount}}\nReason: {{failure_reason}}\n\nPlease try again or contact support if the issue persists.\n\nBest regards,\nKaari Team',
  ARRAY['customer_name', 'order_number', 'amount', 'failure_reason']),

('order_shipped_email', 'order_shipped', 'email',
  'Your Order #{{order_number}} has been shipped!',
  'Dear {{customer_name}},\n\nGreat news! Your order has been shipped.\n\nCarrier: {{carrier}}\nTracking Number: {{tracking_number}}\nTrack here: {{tracking_url}}\n\nEstimated Delivery: {{estimated_delivery}}\n\nBest regards,\nKaari Team',
  ARRAY['customer_name', 'order_number', 'carrier', 'tracking_number', 'tracking_url', 'estimated_delivery']),

('order_delivered_email', 'order_delivered', 'email',
  'Your Order #{{order_number}} has been delivered!',
  'Dear {{customer_name}},\n\nYour order has been successfully delivered!\n\nOrder Number: {{order_number}}\nDelivered on: {{delivered_at}}\n\nWe hope you love your purchase. Please consider leaving a review!\n\nBest regards,\nKaari Team',
  ARRAY['customer_name', 'order_number', 'delivered_at']),

-- SMS templates (160 chars max)
('order_confirmation_sms', 'order_confirmation', 'sms',
  NULL,
  'Kaari: Order #{{order_number}} confirmed! Total ₹{{amount}}. We''ll notify you when shipped.',
  ARRAY['order_number', 'amount']),

('order_shipped_sms', 'order_shipped', 'sms',
  NULL,
  'Kaari: Order #{{order_number}} shipped via {{carrier}}. Track: {{tracking_url}}',
  ARRAY['order_number', 'carrier', 'tracking_url']),

('order_delivered_sms', 'order_delivered', 'sms',
  NULL,
  'Kaari: Order #{{order_number}} delivered! Thank you for shopping with us.',
  ARRAY['order_number']),

('payment_failed_sms', 'payment_failed', 'sms',
  NULL,
  'Kaari: Payment failed for Order #{{order_number}}. Please try again.',
  ARRAY['order_number'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 8. FUNCTIONS FOR NOTIFICATIONS
-- ============================================================================

-- Function to queue a notification
CREATE OR REPLACE FUNCTION public.queue_notification(
  p_user_id uuid,
  p_type text,
  p_channel text,
  p_recipient text,
  p_subject text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    order_id,
    type,
    channel,
    status,
    recipient,
    subject,
    content,
    metadata
  ) VALUES (
    p_user_id,
    p_order_id,
    p_type,
    p_channel,
    'pending',
    p_recipient,
    p_subject,
    p_content,
    p_metadata
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION public.mark_notification_sent(
  p_notification_id uuid,
  p_provider_response jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET status = 'sent',
      sent_at = now(),
      provider_response = COALESCE(p_provider_response, provider_response)
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as delivered
CREATE OR REPLACE FUNCTION public.mark_notification_delivered(
  p_notification_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET status = 'delivered',
      delivered_at = now()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as failed
CREATE OR REPLACE FUNCTION public.mark_notification_failed(
  p_notification_id uuid,
  p_error_message text
) RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET status = 'failed',
      error_message = p_error_message
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payment gateways (admin only)
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage payment gateways"
  ON public.payment_gateways FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cashfree sessions
ALTER TABLE public.cashfree_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment sessions"
  ON public.cashfree_sessions FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access to cashfree sessions"
  ON public.cashfree_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin can manage all shipments"
  ON public.shipments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Shipment events
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipment events"
  ON public.shipment_events FOR SELECT
  USING (shipment_id IN (
    SELECT s.id FROM public.shipments s
    JOIN public.orders o ON s.order_id = o.id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY "Admin can manage shipment events"
  ON public.shipment_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Templates (read-only for authenticated users)
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active templates"
  ON public.notification_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage templates"
  ON public.notification_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT ON public.notifications TO authenticated;
GRANT SELECT ON public.notification_templates TO authenticated;
GRANT SELECT ON public.shipments TO authenticated;
GRANT SELECT ON public.shipment_events TO authenticated;
GRANT SELECT ON public.cashfree_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION public.queue_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_failed TO authenticated;

-- ============================================================================
-- 11. TRIGGER FOR ORDER STATUS NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When order status changes to shipped
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    -- Queue SMS notification
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_shipped',
      'sms',
      (SELECT phone FROM public.profiles WHERE id = NEW.user_id),
      NULL,
      NULL,
      NEW.id
    );
    -- Queue email notification
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_shipped',
      'email',
      (SELECT p.email FROM public.profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE p.id = NEW.user_id),
      'Your order has been shipped!',
      NULL,
      NEW.id
    );
  END IF;

  -- When order is delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_delivered',
      'sms',
      (SELECT phone FROM public.profiles WHERE id = NEW.user_id),
      NULL,
      NULL,
      NEW.id
    );
    PERFORM public.queue_notification(
      NEW.user_id,
      'order_delivered',
      'email',
      (SELECT p.email FROM public.profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE p.id = NEW.user_id),
      'Your order has been delivered!',
      NULL,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_order_status_notifications ON public.orders;
CREATE TRIGGER tr_order_status_notifications
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- ============================================================================
-- 12. TRIGGER FOR PAYMENT STATUS NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment is successful
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    PERFORM public.queue_notification(
      (SELECT user_id FROM public.orders WHERE id = NEW.order_id),
      'payment_success',
      'email',
      (SELECT u.email FROM auth.users u
       JOIN public.orders o ON o.user_id = u.id
       WHERE o.id = NEW.order_id),
      'Payment Successful!',
      NULL,
      NEW.order_id,
      jsonb_build_object('amount', NEW.amount, 'transaction_id', NEW.external_transaction_id)
    );
  END IF;

  -- When payment fails
  IF NEW.status IN ('failed', 'cancelled') AND OLD.status NOT IN ('failed', 'cancelled') THEN
    PERFORM public.queue_notification(
      (SELECT user_id FROM public.orders WHERE id = NEW.order_id),
      'payment_failed',
      'email',
      (SELECT u.email FROM auth.users u
       JOIN public.orders o ON o.user_id = u.id
       WHERE o.id = NEW.order_id),
      'Payment Failed',
      NULL,
      NEW.order_id,
      jsonb_build_object('amount', NEW.amount, 'failure_reason', NEW.failure_reason)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_payment_status_notifications ON public.payments;
CREATE TRIGGER tr_payment_status_notifications
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_status_change();