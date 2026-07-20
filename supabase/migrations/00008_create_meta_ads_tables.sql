-- Migration 00008: Meta Ads tables (campaigns, ad sets, ads)

CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  delivery_status TEXT DEFAULT '',
  budget_type TEXT DEFAULT '',
  budget_amount NUMERIC(14,2) DEFAULT 0,
  spend NUMERIC(14,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  results INTEGER DEFAULT 0,
  cost_per_result NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, month, campaign_name)
);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meta_campaigns_select" ON public.meta_campaigns;
CREATE POLICY "meta_campaigns_select"
  ON public.meta_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = meta_campaigns.client_id)
  );

DROP POLICY IF EXISTS "meta_campaigns_insert" ON public.meta_campaigns;
CREATE POLICY "meta_campaigns_insert"
  ON public.meta_campaigns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "meta_campaigns_delete" ON public.meta_campaigns;
CREATE POLICY "meta_campaigns_delete"
  ON public.meta_campaigns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE TABLE IF NOT EXISTS public.meta_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  ad_set_name TEXT NOT NULL,
  campaign_name TEXT DEFAULT '',
  category TEXT DEFAULT '',
  spend NUMERIC(14,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  results INTEGER DEFAULT 0,
  cost_per_result NUMERIC(14,2) DEFAULT 0,
  budget NUMERIC(14,2) DEFAULT 0,
  bid_strategy TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meta_ad_sets_select" ON public.meta_ad_sets;
CREATE POLICY "meta_ad_sets_select"
  ON public.meta_ad_sets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = meta_ad_sets.client_id)
  );

DROP POLICY IF EXISTS "meta_ad_sets_insert" ON public.meta_ad_sets;
CREATE POLICY "meta_ad_sets_insert"
  ON public.meta_ad_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "meta_ad_sets_delete" ON public.meta_ad_sets;
CREATE POLICY "meta_ad_sets_delete"
  ON public.meta_ad_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE TABLE IF NOT EXISTS public.meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  ad_name TEXT NOT NULL,
  ad_set_name TEXT DEFAULT '',
  campaign_name TEXT DEFAULT '',
  spend NUMERIC(14,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  results INTEGER DEFAULT 0,
  cost_per_result NUMERIC(14,2) DEFAULT 0,
  quality_ranking TEXT DEFAULT '',
  engagement_ranking TEXT DEFAULT '',
  conversion_ranking TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meta_ads_select" ON public.meta_ads;
CREATE POLICY "meta_ads_select"
  ON public.meta_ads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = meta_ads.client_id)
  );

DROP POLICY IF EXISTS "meta_ads_insert" ON public.meta_ads;
CREATE POLICY "meta_ads_insert"
  ON public.meta_ads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "meta_ads_delete" ON public.meta_ads;
CREATE POLICY "meta_ads_delete"
  ON public.meta_ads FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));
