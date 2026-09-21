-- 00044: Suggestions & bug reports wall (visible to everyone, with comments and reactions)

CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('suggestion', 'bug')),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'en_revision', 'implementada', 'descartada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.suggestion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.suggestion_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.suggestion_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (suggestion_id, user_id)
);

ALTER TABLE public.suggestion_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_suggestions_created ON public.suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_type_status ON public.suggestions(type, status);
CREATE INDEX IF NOT EXISTS idx_suggestion_comments_suggestion ON public.suggestion_comments(suggestion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_suggestion_likes_suggestion ON public.suggestion_likes(suggestion_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_suggestions_updated_at ON public.suggestions;
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

DROP POLICY IF EXISTS suggestions_select ON public.suggestions;
DROP POLICY IF EXISTS suggestions_insert ON public.suggestions;
DROP POLICY IF EXISTS suggestions_update ON public.suggestions;
DROP POLICY IF EXISTS suggestions_delete ON public.suggestions;

CREATE POLICY suggestions_select ON public.suggestions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

CREATE POLICY suggestions_insert ON public.suggestions FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY suggestions_update ON public.suggestions FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
  );

CREATE POLICY suggestions_delete ON public.suggestions FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS suggestion_comments_select ON public.suggestion_comments;
DROP POLICY IF EXISTS suggestion_comments_insert ON public.suggestion_comments;
DROP POLICY IF EXISTS suggestion_comments_delete ON public.suggestion_comments;

CREATE POLICY suggestion_comments_select ON public.suggestion_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

CREATE POLICY suggestion_comments_insert ON public.suggestion_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY suggestion_comments_delete ON public.suggestion_comments FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS suggestion_likes_select ON public.suggestion_likes;
DROP POLICY IF EXISTS suggestion_likes_insert ON public.suggestion_likes;
DROP POLICY IF EXISTS suggestion_likes_delete ON public.suggestion_likes;

CREATE POLICY suggestion_likes_select ON public.suggestion_likes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()));

CREATE POLICY suggestion_likes_insert ON public.suggestion_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY suggestion_likes_delete ON public.suggestion_likes FOR DELETE
  USING (user_id = auth.uid());

-- Add 'sugerencias' to visible_modules defaults
UPDATE public.users SET visible_modules = visible_modules || ARRAY['sugerencias']
WHERE (visible_modules IS NULL OR NOT (visible_modules @> ARRAY['sugerencias']));

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
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights', 'calendarios', 'documentos', 'mensajes', 'sugerencias'];
  ELSIF user_role = 'operador' THEN
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'insights', 'calendarios', 'documentos', 'mensajes', 'sugerencias'];
  ELSE
    user_modules := ARRAY['dashboard', 'analysis', 'insights', 'calendarios', 'documentos', 'mensajes', 'sugerencias'];
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