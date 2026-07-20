-- ============================================================
-- FULL SETUP: Drop existing + recreate everything
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Drop existing tables and functions to start clean
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_weekly_inputs_updated_at ON public.weekly_inputs;
DROP TRIGGER IF EXISTS update_optimizations_updated_at ON public.optimizations;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.optimizations CASCADE;
DROP TABLE IF EXISTS public.campaign_metrics CASCADE;
DROP TABLE IF EXISTS public.weekly_inputs CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- 2. USERS TABLE
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'team', 'client')),
  client_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. CLIENTS TABLE
-- ============================================================
CREATE TABLE public.clients (
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

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Add FK from users.client_id to clients.id
ALTER TABLE public.users ADD CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE POLICY "Admins and team can see all clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = clients.id)
  );

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 4. WEEKLY INPUTS TABLE
-- ============================================================
CREATE TABLE public.weekly_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  google_ads_spend NUMERIC(12,2) DEFAULT 0,
  google_ads_impressions INTEGER DEFAULT 0,
  google_ads_clicks INTEGER DEFAULT 0,
  google_ads_conversions INTEGER DEFAULT 0,
  google_ads_revenue NUMERIC(12,2) DEFAULT 0,
  meta_ads_spend NUMERIC(12,2) DEFAULT 0,
  meta_ads_impressions INTEGER DEFAULT 0,
  meta_ads_clicks INTEGER DEFAULT 0,
  meta_ads_conversions INTEGER DEFAULT 0,
  meta_ads_revenue NUMERIC(12,2) DEFAULT 0,
  tiktok_ads_spend NUMERIC(12,2) DEFAULT 0,
  tiktok_ads_impressions INTEGER DEFAULT 0,
  tiktok_ads_clicks INTEGER DEFAULT 0,
  tiktok_ads_conversions INTEGER DEFAULT 0,
  tiktok_ads_revenue NUMERIC(12,2) DEFAULT 0,
  shopify_spend NUMERIC(12,2) DEFAULT 0,
  shopify_impressions INTEGER DEFAULT 0,
  shopify_clicks INTEGER DEFAULT 0,
  shopify_conversions INTEGER DEFAULT 0,
  shopify_revenue NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  csv_file_url TEXT DEFAULT '',
  status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, week_start_date)
);

ALTER TABLE public.weekly_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read weekly inputs of their clients"
  ON public.weekly_inputs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = weekly_inputs.client_id)
  );

CREATE POLICY "Admins and team can insert weekly inputs"
  ON public.weekly_inputs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE POLICY "Admins and team can update weekly inputs"
  ON public.weekly_inputs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 5. CAMPAIGN METRICS TABLE
-- ============================================================
CREATE TABLE public.campaign_metrics (
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

CREATE POLICY "Users can read campaign metrics of their clients"
  ON public.campaign_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = campaign_metrics.client_id)
  );

CREATE POLICY "Admins and team can insert campaign metrics"
  ON public.campaign_metrics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 6. OPTIMIZATIONS TABLE
-- ============================================================
CREATE TABLE public.optimizations (
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

CREATE POLICY "Users can read optimizations of their clients"
  ON public.optimizations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = optimizations.client_id)
  );

CREATE POLICY "Admins and team can insert optimizations"
  ON public.optimizations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE POLICY "Admins and team can update optimizations"
  ON public.optimizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

-- ============================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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
