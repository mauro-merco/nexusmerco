-- Migration 00003: GA4 Traffic and GC (Gestión Comercial) tables

-- ============================================================
-- 1. GA4 TRAFFIC TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ga4_traffic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  source TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  events INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ga4_traffic ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read GA4 traffic of their clients" ON public.ga4_traffic;
CREATE POLICY "Users can read GA4 traffic of their clients"
  ON public.ga4_traffic
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = ga4_traffic.client_id)
  );

DROP POLICY IF EXISTS "Admins and team can insert GA4 traffic" ON public.ga4_traffic;
CREATE POLICY "Admins and team can insert GA4 traffic"
  ON public.ga4_traffic
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 2. GC METRICS TABLE (monthly projections)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gc_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  -- Projections
  proy_facturacion NUMERIC(12,2) DEFAULT 0,
  proy_fullbai_revenue NUMERIC(12,2) DEFAULT 0,
  proy_visitas INTEGER DEFAULT 0,
  proy_ordenes INTEGER DEFAULT 0,
  proy_cr NUMERIC(6,4) DEFAULT 0,
  proy_ticket_promedio NUMERIC(12,2) DEFAULT 0,
  proy_inversion_total NUMERIC(12,2) DEFAULT 0,
  proy_inv_google NUMERIC(12,2) DEFAULT 0,
  proy_inv_meta NUMERIC(12,2) DEFAULT 0,
  proy_inv_tiktok NUMERIC(12,2) DEFAULT 0,
  proy_relacion NUMERIC(6,4) DEFAULT 0,
  proy_cpa NUMERIC(12,2) DEFAULT 0,
  proy_roas_tiendas NUMERIC(12,6) DEFAULT 0,
  proy_roas_fullbai NUMERIC(12,6) DEFAULT 0,
  proy_cpv NUMERIC(12,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, month)
);

ALTER TABLE public.gc_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read GC metrics of their clients" ON public.gc_metrics;
CREATE POLICY "Users can read GC metrics of their clients"
  ON public.gc_metrics
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = gc_metrics.client_id)
  );

DROP POLICY IF EXISTS "Admins and team can insert GC metrics" ON public.gc_metrics;
CREATE POLICY "Admins and team can insert GC metrics"
  ON public.gc_metrics
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 3. GC DAILY TABLE (daily actuals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gc_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_metrics_id UUID REFERENCES public.gc_metrics(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL,
  facturacion NUMERIC(12,2) DEFAULT 0,
  visitas INTEGER DEFAULT 0,
  ordenes INTEGER DEFAULT 0,
  cr NUMERIC(6,4) DEFAULT 0,
  ticket_promedio NUMERIC(12,2) DEFAULT 0,
  inversion NUMERIC(12,2) DEFAULT 0,
  relacion NUMERIC(6,4) DEFAULT 0,
  cpa NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(12,6) DEFAULT 0,
  cpv NUMERIC(12,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gc_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read GC daily of their clients" ON public.gc_daily;
CREATE POLICY "Users can read GC daily of their clients"
  ON public.gc_daily
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = gc_daily.client_id)
  );

DROP POLICY IF EXISTS "Admins and team can insert GC daily" ON public.gc_daily;
CREATE POLICY "Admins and team can insert GC daily"
  ON public.gc_daily
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 4. ADD COLUMNS TO weekly_inputs FOR FULLBAI-SPECIFIC METRICS
-- ============================================================
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS total_cr NUMERIC(6,4) DEFAULT 0;
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS total_ticket_avg NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.weekly_inputs ADD COLUMN IF NOT EXISTS gc_projection JSONB DEFAULT '{}';
