-- 00058: Centro de Datos module

UPDATE public.users
SET visible_modules = visible_modules || ARRAY['datos']
WHERE visible_modules IS NULL OR NOT (visible_modules @> ARRAY['datos']);

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
    user_modules := ARRAY['dashboard', 'datos', 'tareas', 'equipo', 'calendarios', 'documentos', 'mensajes', 'sugerencias', 'desarrollo'];
  ELSIF user_role = 'operador' THEN
    user_modules := ARRAY['dashboard', 'datos', 'tareas', 'equipo', 'calendarios', 'documentos', 'mensajes', 'sugerencias', 'desarrollo'];
  ELSE
    user_modules := ARRAY['dashboard', 'datos', 'calendarios', 'documentos', 'mensajes', 'sugerencias'];
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
