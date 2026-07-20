-- Migration 00007: Google Ads tables (campaigns, search keywords, asset groups)

CREATE TABLE IF NOT EXISTS public.ga_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT DEFAULT '',
  campaign_status TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  roas NUMERIC(10,4) DEFAULT 0,
  cpc NUMERIC(12,4) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, month, campaign_name)
);

ALTER TABLE public.ga_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga_campaigns_select" ON public.ga_campaigns;
CREATE POLICY "ga_campaigns_select"
  ON public.ga_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = ga_campaigns.client_id)
  );

DROP POLICY IF EXISTS "ga_campaigns_insert" ON public.ga_campaigns;
CREATE POLICY "ga_campaigns_insert"
  ON public.ga_campaigns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "ga_campaigns_delete" ON public.ga_campaigns;
CREATE POLICY "ga_campaigns_delete"
  ON public.ga_campaigns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE TABLE IF NOT EXISTS public.ga_search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  keyword TEXT NOT NULL,
  match_type TEXT DEFAULT '',
  campaign_name TEXT DEFAULT '',
  ad_group_name TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  cpc NUMERIC(12,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ga_search_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga_search_keywords_select" ON public.ga_search_keywords;
CREATE POLICY "ga_search_keywords_select"
  ON public.ga_search_keywords FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = ga_search_keywords.client_id)
  );

DROP POLICY IF EXISTS "ga_search_keywords_insert" ON public.ga_search_keywords;
CREATE POLICY "ga_search_keywords_insert"
  ON public.ga_search_keywords FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "ga_search_keywords_delete" ON public.ga_search_keywords;
CREATE POLICY "ga_search_keywords_delete"
  ON public.ga_search_keywords FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

CREATE TABLE IF NOT EXISTS public.ga_asset_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  asset_group_name TEXT NOT NULL,
  campaign_name TEXT DEFAULT '',
  category TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ga_asset_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga_asset_groups_select" ON public.ga_asset_groups;
CREATE POLICY "ga_asset_groups_select"
  ON public.ga_asset_groups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = ga_asset_groups.client_id)
  );

DROP POLICY IF EXISTS "ga_asset_groups_insert" ON public.ga_asset_groups;
CREATE POLICY "ga_asset_groups_insert"
  ON public.ga_asset_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "ga_asset_groups_delete" ON public.ga_asset_groups;
CREATE POLICY "ga_asset_groups_delete"
  ON public.ga_asset_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));
