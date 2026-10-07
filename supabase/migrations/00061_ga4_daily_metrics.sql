-- 00061: GA4 daily/channel metrics

CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  source_medium TEXT NOT NULL DEFAULT '',
  sessions INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(14,2) DEFAULT 0,
  engagement_rate NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_metrics_unique ON public.analytics_daily_metrics(client_id, date, source_medium);
