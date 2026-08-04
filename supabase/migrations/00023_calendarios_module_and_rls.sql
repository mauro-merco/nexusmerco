-- 00023: Add 'calendarios' module, update social_ideas RLS to be client-scoped

-- 1. Drop old permissive RLS policies on social tables
DROP POLICY IF EXISTS social_ideas_select ON public.social_ideas;
DROP POLICY IF EXISTS social_ideas_insert ON public.social_ideas;
DROP POLICY IF EXISTS social_ideas_update ON public.social_ideas;
DROP POLICY IF EXISTS social_ideas_delete ON public.social_ideas;

DROP POLICY IF EXISTS social_attachments_select ON public.social_attachments;
DROP POLICY IF EXISTS social_attachments_insert ON public.social_attachments;
DROP POLICY IF EXISTS social_attachments_delete ON public.social_attachments;

DROP POLICY IF EXISTS social_comments_select ON public.social_comments;
DROP POLICY IF EXISTS social_comments_insert ON public.social_comments;
DROP POLICY IF EXISTS social_comments_delete ON public.social_comments;

DROP POLICY IF EXISTS social_annotations_select ON public.social_annotations;
DROP POLICY IF EXISTS social_annotations_insert ON public.social_annotations;
DROP POLICY IF EXISTS social_annotations_delete ON public.social_annotations;

-- 2. Create client-scoped RLS policies for social_ideas
-- Admins and operadores can see all ideas
-- Clients can only see ideas for their own client
CREATE POLICY social_ideas_select ON public.social_ideas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = social_ideas.client_id)
  );

CREATE POLICY social_ideas_insert ON public.social_ideas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

CREATE POLICY social_ideas_update ON public.social_ideas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

CREATE POLICY social_ideas_delete ON public.social_ideas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

-- 3. Attachments follow the idea's visibility
CREATE POLICY social_attachments_select ON public.social_attachments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (
      SELECT 1 FROM public.social_ideas si
      JOIN public.users u ON u.id = auth.uid()
      WHERE si.id = social_attachments.idea_id AND u.client_id = si.client_id
    )
  );

CREATE POLICY social_attachments_insert ON public.social_attachments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

CREATE POLICY social_attachments_delete ON public.social_attachments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

-- 4. Comments follow the idea's visibility
CREATE POLICY social_comments_select ON public.social_comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (
      SELECT 1 FROM public.social_ideas si
      JOIN public.users u ON u.id = auth.uid()
      WHERE si.id = social_comments.idea_id AND u.client_id = si.client_id
    )
  );

CREATE POLICY social_comments_insert ON public.social_comments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY social_comments_delete ON public.social_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (
      SELECT 1 FROM public.social_comments sc WHERE sc.id = social_comments.id AND sc.user_id = auth.uid()
    )
  );

-- 5. Annotations follow the comment's visibility
CREATE POLICY social_annotations_select ON public.social_annotations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (
      SELECT 1 FROM public.social_comments sc
      JOIN public.social_ideas si ON si.id = sc.idea_id
      JOIN public.users u ON u.id = auth.uid()
      WHERE sc.id = social_annotations.comment_id AND u.client_id = si.client_id
    )
  );

CREATE POLICY social_annotations_insert ON public.social_annotations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY social_annotations_delete ON public.social_annotations FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

-- 6. Add 'calendarios' to visible_modules defaults
-- Extend the array for admins (already has all), add to operador and client
UPDATE public.users SET visible_modules = visible_modules || ARRAY['calendarios']
WHERE role = 'operador' AND (visible_modules IS NULL OR NOT (visible_modules @> ARRAY['calendarios']));

UPDATE public.users SET visible_modules = visible_modules || ARRAY['calendarios']
WHERE role = 'client' AND (visible_modules IS NULL OR NOT (visible_modules @> ARRAY['calendarios']));

UPDATE public.users SET visible_modules = visible_modules || ARRAY['calendarios']
WHERE role = 'admin' AND (visible_modules IS NULL OR NOT (visible_modules @> ARRAY['calendarios']));

-- 7. Update handle_new_user trigger to include calendarios
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
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights', 'calendarios'];
  ELSIF user_role = 'operador' THEN
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'insights', 'calendarios'];
  ELSE
    user_modules := ARRAY['dashboard', 'analysis', 'insights', 'calendarios'];
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
