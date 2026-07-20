-- Migration 00009: Analytics (GA4) traffic table

CREATE TABLE IF NOT EXISTS public.analytics_traffic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  source_medium TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  engaged_sessions INTEGER DEFAULT 0,
  engagement_rate NUMERIC(10,6) DEFAULT 0,
  avg_engagement_time NUMERIC(10,4) DEFAULT 0,
  events_per_session NUMERIC(10,4) DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  key_events INTEGER DEFAULT 0,
  key_event_rate NUMERIC(10,6) DEFAULT 0,
  total_revenue NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, month, source_medium)
);

ALTER TABLE public.analytics_traffic ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_traffic_select" ON public.analytics_traffic;
CREATE POLICY "analytics_traffic_select"
  ON public.analytics_traffic FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = analytics_traffic.client_id)
  );

DROP POLICY IF EXISTS "analytics_traffic_insert" ON public.analytics_traffic;
CREATE POLICY "analytics_traffic_insert"
  ON public.analytics_traffic FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "analytics_traffic_delete" ON public.analytics_traffic;
CREATE POLICY "analytics_traffic_delete"
  ON public.analytics_traffic FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));
