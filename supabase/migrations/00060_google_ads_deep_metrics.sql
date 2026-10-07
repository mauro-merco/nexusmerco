-- 00060: Google Ads deep metrics

CREATE TABLE IF NOT EXISTS public.ga_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  roas NUMERIC(10,4) DEFAULT 0,
  cpc NUMERIC(12,4) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ga_daily_metrics_unique ON public.ga_daily_metrics(client_id, date, campaign_name);

CREATE TABLE IF NOT EXISTS public.ga_search_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  search_term TEXT NOT NULL,
  campaign_name TEXT DEFAULT '',
  ad_group_name TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ga_search_terms_unique ON public.ga_search_terms(client_id, month, search_term, campaign_name, ad_group_name);

CREATE TABLE IF NOT EXISTS public.ga_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  segment_type TEXT NOT NULL,
  segment_value TEXT NOT NULL,
  campaign_name TEXT DEFAULT '',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost NUMERIC(14,2) DEFAULT 0,
  conversions NUMERIC(12,2) DEFAULT 0,
  conv_value NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ga_segments_unique ON public.ga_segments(client_id, month, segment_type, segment_value, campaign_name);
