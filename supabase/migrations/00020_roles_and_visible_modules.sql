-- 00020: Update roles to admin/operador/client + add visible_modules

-- Backfill: rename 'team' role to 'operador'
UPDATE public.users SET role = 'operador' WHERE role = 'team';

-- Drop old check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new check constraint with operador
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'operador', 'client'));

-- Add visible_modules column (array of module IDs the user can see in sidebar)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS visible_modules TEXT[] DEFAULT NULL;

-- Set defaults based on current role
UPDATE public.users SET visible_modules = ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights'] WHERE role = 'admin' AND visible_modules IS NULL;
UPDATE public.users SET visible_modules = ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'insights'] WHERE role = 'operador' AND visible_modules IS NULL;
UPDATE public.users SET visible_modules = ARRAY['dashboard', 'analysis', 'insights'] WHERE role = 'client' AND visible_modules IS NULL;

-- Update handle_new_user trigger to include visible_modules and app_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_modules TEXT[];
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'client');

  IF user_role = 'admin' THEN
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights'];
  ELSIF user_role = 'operador' THEN
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'insights'];
  ELSE
    user_modules := ARRAY['dashboard', 'analysis', 'insights'];
  END IF;

  INSERT INTO public.users (id, email, full_name, avatar_url, role, app_id, visible_modules)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    user_role,
    COALESCE(NEW.raw_user_meta_data ->> 'app_id', 'nexus'),
    user_modules
  );
  RETURN NEW;
END;
$$;
