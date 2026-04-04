-- Payment Sessions Table for Server-Side Session Management
-- This replaces client-side sessionStorage for payment sessions
-- SECURITY: Prevents session manipulation and amount tampering

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  transaction_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_currency CHECK (currency = 'INR'),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'cod'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON public.payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order_id ON public.payment_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_expires_at ON public.payment_sessions(expires_at);

-- RLS Policies
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment sessions
CREATE POLICY "Users can view own payment sessions" ON public.payment_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create payment sessions for their own orders
CREATE POLICY "Users can create own payment sessions" ON public.payment_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all payment sessions
CREATE POLICY "Service role can manage all payment sessions" ON public.payment_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to create a payment session with validation
CREATE OR REPLACE FUNCTION public.create_payment_session(
  p_order_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_expires_in_minutes INT DEFAULT 15
)
RETURNS TABLE (
  session_id TEXT,
  order_id UUID,
  amount NUMERIC,
  currency TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id TEXT;
  v_expires_at TIMESTAMPTZ;
  v_order_user_id UUID;
  v_order_total NUMERIC;
  v_order_status TEXT;
BEGIN
  -- Validate order exists and belongs to user
  SELECT user_id, total_amount, status
  INTO v_order_user_id, v_order_total, v_order_status
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_user_id != p_user_id THEN
    RAISE EXCEPTION 'Order does not belong to user';
  END IF;

  -- Only allow payment for pending orders
  IF v_order_status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Order status % cannot accept payment', v_order_status;
  END IF;

  -- Verify amount matches order total (prevents amount tampering)
  IF ABS(v_order_total - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'Amount mismatch: expected %, got %', v_order_total, p_amount;
  END IF;

  -- Generate secure session ID
  v_session_id := 'pay_' || encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;

  -- Create payment session
  INSERT INTO public.payment_sessions (
    session_id,
    order_id,
    user_id,
    amount,
    currency,
    payment_method,
    status,
    expires_at
  ) VALUES (
    v_session_id,
    p_order_id,
    p_user_id,
    p_amount,
    'INR',
    p_payment_method,
    'pending',
    v_expires_at
  );

  RETURN QUERY SELECT v_session_id, p_order_id, p_amount, 'INR'::TEXT, v_expires_at;
END;
$$;

-- Function to verify and process payment session
CREATE OR REPLACE FUNCTION public.verify_payment_session(
  p_session_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  session_id TEXT,
  order_id UUID,
  amount NUMERIC,
  status TEXT,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
BEGIN
  -- Get session
  SELECT * INTO v_session
  FROM public.payment_sessions
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, p_session_id, NULL::UUID, NULL::NUMERIC, NULL::TEXT, 'Session not found'::TEXT;
    RETURN;
  END IF;

  -- Check expiration
  IF v_session.expires_at < now() THEN
    UPDATE public.payment_sessions SET status = 'expired' WHERE id = v_session.id;
    RETURN QUERY SELECT FALSE, p_session_id, v_session.order_id, v_session.amount, 'expired'::TEXT, 'Session expired'::TEXT;
    RETURN;
  END IF;

  -- Check status
  IF v_session.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, p_session_id, v_session.order_id, v_session.amount, v_session.status, 'Session already processed'::TEXT;
    RETURN;
  END IF;

  -- Verify user ownership if provided
  IF p_user_id IS NOT NULL AND v_session.user_id != p_user_id THEN
    RETURN QUERY SELECT FALSE, p_session_id, NULL::UUID, NULL::NUMERIC, NULL::TEXT, 'Session ownership mismatch'::TEXT;
    RETURN;
  END IF;

  -- Return valid session
  RETURN QUERY SELECT TRUE, v_session.session_id, v_session.order_id, v_session.amount, v_session.status, NULL::TEXT;
END;
$$;

-- Function to mark payment session as completed
CREATE OR REPLACE FUNCTION public.complete_payment_session(
  p_session_id TEXT,
  p_transaction_id TEXT,
  p_status TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  order_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
  v_order_status TEXT;
BEGIN
  -- Get and lock session
  SELECT * INTO v_session
  FROM public.payment_sessions
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Session not found'::TEXT;
    RETURN;
  END IF;

  -- Check status
  IF v_session.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, v_session.order_id, 'Session already processed'::TEXT;
    RETURN;
  END IF;

  -- Update session
  UPDATE public.payment_sessions
  SET
    status = p_status,
    transaction_id = p_transaction_id,
    completed_at = now()
  WHERE id = v_session.id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_session.order_id, 'Payment session updated'::TEXT;
END;
$$;

-- Function to cleanup expired sessions (to be called by cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_payment_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  UPDATE public.payment_sessions
  SET status = 'expired'
  WHERE expires_at < now() AND status = 'pending';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete sessions older than 7 days
  DELETE FROM public.payment_sessions
  WHERE created_at < now() - INTERVAL '7 days';

  RETURN deleted_count;
END;
$$;

-- Comment on tables
COMMENT ON TABLE public.payment_sessions IS 'Server-side payment session storage for security';
COMMENT ON FUNCTION public.create_payment_session IS 'Creates a payment session with order validation and amount verification';
COMMENT ON FUNCTION public.verify_payment_session IS 'Verifies payment session validity and ownership';
COMMENT ON FUNCTION public.complete_payment_session IS 'Marks payment session as completed or failed';
COMMENT ON FUNCTION public.cleanup_expired_payment_sessions IS 'Cleans up expired payment sessions (call via cron)';