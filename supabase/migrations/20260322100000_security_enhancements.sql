-- Security Enhancements Migration
-- Creates tables and policies for admin audit logging

-- Admin Audit Log Table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    changes_before JSONB,
    changes_after JSONB,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource_type ON public.admin_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource_id ON public.admin_audit_log(resource_id);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert audit logs (via service role or admin)
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- No one can update or delete audit logs (immutable)
CREATE POLICY "No updates to audit logs"
  ON public.admin_audit_log FOR UPDATE
  USING (false);

CREATE POLICY "No deletes to audit logs"
  ON public.admin_audit_log FOR DELETE
  USING (false);

-- Security Event Log Table (for tracking security events)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage security events
CREATE POLICY "Service role full access to security events"
  ON public.security_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view security events
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Rate Limit Tracking Table (for server-side rate limiting)
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    action_type TEXT NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(identifier, action_type)
);

-- Add index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_entries(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_action_type ON public.rate_limit_entries(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON public.rate_limit_entries(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limit entries
CREATE POLICY "Service role full access to rate limits"
  ON public.rate_limit_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.rate_limit_entries
  WHERE blocked_until IS NOT NULL AND blocked_until < NOW()
     OR first_attempt < NOW() - INTERVAL '1 hour';
END;
$$;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup_rate_limits', '*/5 * * * *', 'SELECT public.cleanup_expired_rate_limits()');

-- Add comment to tables
COMMENT ON TABLE public.admin_audit_log IS 'Immutable audit log of all admin actions for security compliance';
COMMENT ON TABLE public.security_events IS 'Security-related events tracking for monitoring and investigation';
COMMENT ON TABLE public.rate_limit_entries IS 'Server-side rate limiting tracking to prevent abuse';