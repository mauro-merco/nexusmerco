-- 00059: API integration settings per client

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT,
ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS ga4_property_id TEXT,
ADD COLUMN IF NOT EXISTS last_google_ads_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_meta_ads_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_ga4_sync_at TIMESTAMPTZ;
