-- 00024: Document center (Word-like documents with sharing)

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sin título',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document shares (which users can access a document)
CREATE TABLE IF NOT EXISTS public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON public.document_shares(user_id);

-- Helper: update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Documents: owner or shared users can read
DROP POLICY IF EXISTS documents_select ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
DROP POLICY IF EXISTS documents_update ON public.documents;
DROP POLICY IF EXISTS documents_delete ON public.documents;

CREATE POLICY documents_select ON public.documents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.document_shares ds WHERE ds.document_id = documents.id AND ds.user_id = auth.uid())
  );

CREATE POLICY documents_insert ON public.documents FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY documents_update ON public.documents FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.document_shares ds WHERE ds.document_id = documents.id AND ds.user_id = auth.uid())
  );

CREATE POLICY documents_delete ON public.documents FOR DELETE
  USING (owner_id = auth.uid());

-- Document shares: owner manages, participants can see their own shares
DROP POLICY IF EXISTS document_shares_select ON public.document_shares;
DROP POLICY IF EXISTS document_shares_insert ON public.document_shares;
DROP POLICY IF EXISTS document_shares_delete ON public.document_shares;

CREATE POLICY document_shares_select ON public.document_shares FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid())
    OR
    user_id = auth.uid()
  );

CREATE POLICY document_shares_insert ON public.document_shares FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid())
  );

CREATE POLICY document_shares_delete ON public.document_shares FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid())
  );

-- Add 'documentos' to visible_modules defaults
UPDATE public.users SET visible_modules = visible_modules || ARRAY['documentos']
WHERE (visible_modules IS NULL OR NOT (visible_modules @> ARRAY['documentos']));

-- Update handle_new_user trigger to include documentos
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
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights', 'calendarios', 'documentos'];
  ELSIF user_role = 'operador' THEN
    user_modules := ARRAY['dashboard', 'wizard', 'tareas', 'analysis', 'insights', 'calendarios', 'documentos'];
  ELSE
    user_modules := ARRAY['dashboard', 'analysis', 'insights', 'calendarios', 'documentos'];
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
