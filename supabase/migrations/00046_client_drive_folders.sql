-- 00046: Important Google Drive folders per client

CREATE TABLE IF NOT EXISTS public.client_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_drive_folders_client_id ON public.client_drive_folders(client_id);

ALTER TABLE public.client_drive_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view client drive folders" ON public.client_drive_folders;
CREATE POLICY "Authenticated users can view client drive folders"
  ON public.client_drive_folders FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Internal users can manage client drive folders" ON public.client_drive_folders;
CREATE POLICY "Internal users can manage client drive folders"
  ON public.client_drive_folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operador')
    )
  );
