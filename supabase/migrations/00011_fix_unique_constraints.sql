-- Migration 00011: Fix unique constraints to include campaign_name
-- Prevents duplicate key errors when same ad_set/ad name exists across campaigns

-- meta_ad_sets: include campaign_name
DROP INDEX IF EXISTS public.meta_ad_sets_weekly_unique;
DROP INDEX IF EXISTS public.meta_ad_sets_monthly_unique;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ad_sets_weekly_unique
  ON public.meta_ad_sets (client_id, month, week_start, campaign_name, ad_set_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ad_sets_monthly_unique
  ON public.meta_ad_sets (client_id, month, campaign_name, ad_set_name) WHERE week_start IS NULL;

-- meta_ads: include campaign_name
DROP INDEX IF EXISTS public.meta_ads_weekly_unique;
DROP INDEX IF EXISTS public.meta_ads_monthly_unique;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ads_weekly_unique
  ON public.meta_ads (client_id, month, week_start, campaign_name, ad_name) WHERE week_start IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meta_ads_monthly_unique
  ON public.meta_ads (client_id, month, campaign_name, ad_name) WHERE week_start IS NULL;
