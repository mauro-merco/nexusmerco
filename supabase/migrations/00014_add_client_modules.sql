-- 00014: Add module toggles to clients

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS social_calendar_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS analysis_enabled BOOLEAN DEFAULT TRUE;
