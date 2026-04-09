-- Migration: Create email queue table
-- Description: Table for queueing emails to be sent reliably via cron job

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_confirmation', 'shipping_notification', 'delivery_update')),
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_order_id ON public.email_queue(order_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_queue TO service_role;