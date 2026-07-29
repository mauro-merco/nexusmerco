-- 00019: Add app_id to users table to isolate users per app

-- Add app_id column (text, not null with default for existing rows)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS app_id TEXT NOT NULL DEFAULT 'nexus';

-- Backfill: all existing users are assumed to be from this app
-- (users from other apps will need to be manually set or removed)
UPDATE public.users SET app_id = 'nexus' WHERE app_id IS NULL;

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_users_app_id ON public.users(app_id);

-- Update the handle_new_user trigger to accept app_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role, app_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    COALESCE(NEW.raw_user_meta_data ->> 'app_id', 'nexus')
  );
  RETURN NEW;
END;
$$;
