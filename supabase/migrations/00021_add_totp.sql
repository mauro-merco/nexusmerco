-- 00021: Add TOTP (Google Authenticator) support

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
