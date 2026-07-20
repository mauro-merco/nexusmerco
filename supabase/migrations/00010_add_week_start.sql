-- Migration 00010: Add week_start column + partial unique indexes for weekly/monthly data

-- 1. ga_campaigns
ALTER TABLE public.ga_campaigns ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE public.ga_campaigns DROP CONSTRAINT IF EXISTS ga_campaigns_client_id_month_campaign_name_key;
DROP INDEX IF EXISTS public.ga_campaigns_client_id_month_campaign_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS ga_campaigns_weekly_unique
  ON public.ga_campaigns (client_id, month, week_start, campaign_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ga_campaigns_monthly_unique
  ON public.ga_campaigns (client_id, month, campaign_name) WHERE week_start IS NULL;

-- 2. ga_search_keywords
ALTER TABLE public.ga_search_keywords ADD COLUMN IF NOT EXISTS week_start DATE;
CREATE UNIQUE INDEX IF NOT EXISTS ga_search_keywords_weekly_unique
  ON public.ga_search_keywords (client_id, month, week_start, keyword, match_type, campaign_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ga_search_keywords_monthly_unique
  ON public.ga_search_keywords (client_id, month, keyword, match_type, campaign_name) WHERE week_start IS NULL;

-- 3. ga_asset_groups
ALTER TABLE public.ga_asset_groups ADD COLUMN IF NOT EXISTS week_start DATE;
CREATE UNIQUE INDEX IF NOT EXISTS ga_asset_groups_weekly_unique
  ON public.ga_asset_groups (client_id, month, week_start, asset_group_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ga_asset_groups_monthly_unique
  ON public.ga_asset_groups (client_id, month, asset_group_name) WHERE week_start IS NULL;

-- 4. meta_campaigns
ALTER TABLE public.meta_campaigns ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE public.meta_campaigns DROP CONSTRAINT IF EXISTS meta_campaigns_client_id_month_campaign_name_key;
DROP INDEX IF EXISTS public.meta_campaigns_client_id_month_campaign_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS meta_campaigns_weekly_unique
  ON public.meta_campaigns (client_id, month, week_start, campaign_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meta_campaigns_monthly_unique
  ON public.meta_campaigns (client_id, month, campaign_name) WHERE week_start IS NULL;

-- 5. meta_ad_sets
ALTER TABLE public.meta_ad_sets ADD COLUMN IF NOT EXISTS week_start DATE;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ad_sets_weekly_unique
  ON public.meta_ad_sets (client_id, month, week_start, ad_set_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ad_sets_monthly_unique
  ON public.meta_ad_sets (client_id, month, ad_set_name) WHERE week_start IS NULL;

-- 6. meta_ads
ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS week_start DATE;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ads_weekly_unique
  ON public.meta_ads (client_id, month, week_start, ad_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ads_monthly_unique
  ON public.meta_ads (client_id, month, ad_name) WHERE week_start IS NULL;

-- 7. analytics_traffic
ALTER TABLE public.analytics_traffic ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE public.analytics_traffic DROP CONSTRAINT IF EXISTS analytics_traffic_client_id_month_source_medium_key;
DROP INDEX IF EXISTS public.analytics_traffic_client_id_month_source_medium_key;
CREATE UNIQUE INDEX IF NOT EXISTS analytics_traffic_weekly_unique
  ON public.analytics_traffic (client_id, month, week_start, source_medium) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS analytics_traffic_monthly_unique
  ON public.analytics_traffic (client_id, month, source_medium) WHERE week_start IS NULL;
