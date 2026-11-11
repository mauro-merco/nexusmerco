-- 00082: Centro de documentos 2.0
--   * Documentos con tipo (documento / nota / reunión / brief), estado, etiquetas,
--     color, emoji, favoritos y archivado.
--   * Las notas adhesivas pasan a ser documentos de tipo "nota" (se copian, la
--     tabla sticky_notes NO se borra).
--   * Vínculos documento <-> tarea (en los dos sentidos).
--   * Comentarios en documentos (con respuestas).
--   * Último "visto" y favoritos por usuario.
-- Es idempotente: se puede correr más de una vez sin duplicar nada.

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas en documents
-- ---------------------------------------------------------------------------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'documento',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_note_id UUID;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_kind_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_kind_check
  CHECK (kind IN ('documento', 'nota', 'reunion', 'brief'));

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'final'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_legacy_note ON public.documents(legacy_note_id) WHERE legacy_note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON public.documents(kind);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN (tags);

-- ---------------------------------------------------------------------------
-- 2. Notas adhesivas -> documentos de tipo "nota"
--    El texto plano se convierte a HTML seguro; la categoría pasa a etiqueta.
-- ---------------------------------------------------------------------------
INSERT INTO public.documents (owner_id, title, content, kind, status, tags, color, is_public, legacy_note_id, created_at, updated_at)
SELECT
  sn.user_id,
  COALESCE(NULLIF(TRIM(sn.title), ''), 'Nota'),
  CASE WHEN COALESCE(sn.content, '') = '' THEN ''
       ELSE '<p>' || REPLACE(REPLACE(REPLACE(REPLACE(sn.content, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '<br>') || '</p>'
  END,
  'nota',
  'borrador',
  CASE WHEN COALESCE(TRIM(sn.category), '') = '' THEN '{}'::TEXT[] ELSE ARRAY[TRIM(sn.category)] END,
  sn.color,
  COALESCE(sn.is_public, false),
  sn.id,
  sn.created_at,
  sn.updated_at
FROM public.sticky_notes sn
JOIN public.users u ON u.id = sn.user_id
WHERE NOT EXISTS (SELECT 1 FROM public.documents d WHERE d.legacy_note_id = sn.id);

-- ---------------------------------------------------------------------------
-- 3. Vínculos documento <-> tarea
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_document_links_document ON public.document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_task ON public.document_links(task_id);

ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_links_staff_select ON public.document_links;
CREATE POLICY document_links_staff_select ON public.document_links FOR SELECT USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- 4. Comentarios en documentos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_comments_document ON public.document_comments(document_id, created_at);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_comments_staff_select ON public.document_comments;
CREATE POLICY document_comments_staff_select ON public.document_comments FOR SELECT USING (public.is_staff() OR user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Estado por usuario: favorito + último visto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_user_state (
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  last_viewed_at TIMESTAMPTZ,
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_document_user_state_user ON public.document_user_state(user_id);

ALTER TABLE public.document_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_user_state_own ON public.document_user_state;
CREATE POLICY document_user_state_own ON public.document_user_state FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
