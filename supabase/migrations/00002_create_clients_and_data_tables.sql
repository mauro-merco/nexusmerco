-- Run this in your Supabase SQL Editor
-- Migration 00002: Clients, weekly inputs, campaign metrics, optimizations

-- ============================================================
-- 1. CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  campaign_types TEXT[] DEFAULT '{}',
  plan TEXT DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'onboarding')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ADD client_id TO public.users (must be before RLS policies that reference it)
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and team can see all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

-- Admins and team can see all clients
CREATE POLICY "Admins and team can see all clients"
  ON public.clients
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = clients.id)
  );

-- Admins can insert/update/delete clients
CREATE POLICY "Admins can insert clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update clients"
  ON public.clients
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete clients"
  ON public.clients
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 3. WEEKLY INPUTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  -- Google Ads
  google_ads_spend NUMERIC(12,2) DEFAULT 0,
  google_ads_impressions INTEGER DEFAULT 0,
  google_ads_clicks INTEGER DEFAULT 0,
  google_ads_conversions INTEGER DEFAULT 0,
  google_ads_revenue NUMERIC(12,2) DEFAULT 0,
  -- Meta Ads
  meta_ads_spend NUMERIC(12,2) DEFAULT 0,
  meta_ads_impressions INTEGER DEFAULT 0,
  meta_ads_clicks INTEGER DEFAULT 0,
  meta_ads_conversions INTEGER DEFAULT 0,
  meta_ads_revenue NUMERIC(12,2) DEFAULT 0,
  -- TikTok Ads
  tiktok_ads_spend NUMERIC(12,2) DEFAULT 0,
  tiktok_ads_impressions INTEGER DEFAULT 0,
  tiktok_ads_clicks INTEGER DEFAULT 0,
  tiktok_ads_conversions INTEGER DEFAULT 0,
  tiktok_ads_revenue NUMERIC(12,2) DEFAULT 0,
  -- Shopify
  shopify_spend NUMERIC(12,2) DEFAULT 0,
  shopify_impressions INTEGER DEFAULT 0,
  shopify_clicks INTEGER DEFAULT 0,
  shopify_conversions INTEGER DEFAULT 0,
  shopify_revenue NUMERIC(12,2) DEFAULT 0,
  -- Metadata
  notes TEXT DEFAULT '',
  csv_file_url TEXT DEFAULT '',
  status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, week_start_date)
);

ALTER TABLE public.weekly_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read weekly inputs of their clients" ON public.weekly_inputs;
DROP POLICY IF EXISTS "Admins and team can insert weekly inputs" ON public.weekly_inputs;
DROP POLICY IF EXISTS "Admins and team can update weekly inputs" ON public.weekly_inputs;

CREATE POLICY "Users can read weekly inputs of their clients"
  ON public.weekly_inputs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = weekly_inputs.client_id)
  );

CREATE POLICY "Admins and team can insert weekly inputs"
  ON public.weekly_inputs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE POLICY "Admins and team can update weekly inputs"
  ON public.weekly_inputs
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 4. CAMPAIGN METRICS TABLE (desglose por campaña del CSV)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_input_id UUID REFERENCES public.weekly_inputs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'google_ads',
  campaign_name TEXT NOT NULL,
  campaign_type TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  ctr NUMERIC(6,4) DEFAULT 0,
  cpc NUMERIC(12,6) DEFAULT 0,
  roas NUMERIC(12,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read campaign metrics of their clients" ON public.campaign_metrics;
DROP POLICY IF EXISTS "Admins and team can insert campaign metrics" ON public.campaign_metrics;

CREATE POLICY "Users can read campaign metrics of their clients"
  ON public.campaign_metrics
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = campaign_metrics.client_id)
  );

CREATE POLICY "Admins and team can insert campaign metrics"
  ON public.campaign_metrics
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 5. OPTIMIZATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  weekly_input_id UUID REFERENCES public.weekly_inputs(id) ON DELETE SET NULL,
  platform TEXT DEFAULT '',
  title TEXT NOT NULL,
  action_taken TEXT DEFAULT '',
  expected_impact TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read optimizations of their clients" ON public.optimizations;
DROP POLICY IF EXISTS "Admins and team can insert optimizations" ON public.optimizations;
DROP POLICY IF EXISTS "Admins and team can update optimizations" ON public.optimizations;

CREATE POLICY "Users can read optimizations of their clients"
  ON public.optimizations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = optimizations.client_id)
  );

CREATE POLICY "Admins and team can insert optimizations"
  ON public.optimizations
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE POLICY "Admins and team can update optimizations"
  ON public.optimizations
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 6. HELPER: update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_weekly_inputs_updated_at ON public.weekly_inputs;
DROP TRIGGER IF EXISTS update_optimizations_updated_at ON public.optimizations;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_weekly_inputs_updated_at
  BEFORE UPDATE ON public.weekly_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_optimizations_updated_at
  BEFORE UPDATE ON public.optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
