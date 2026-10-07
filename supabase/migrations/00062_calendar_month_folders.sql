-- 00062: Folder/link per calendar month

CREATE TABLE IF NOT EXISTS public.calendar_month_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('social', 'ads')),
  month TEXT NOT NULL,
  folder_url TEXT NOT NULL DEFAULT '',
  title TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, calendar_type, month)
);

ALTER TABLE public.calendar_month_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_month_folders_select ON public.calendar_month_folders;
CREATE POLICY calendar_month_folders_select ON public.calendar_month_folders FOR SELECT USING (true);

DROP POLICY IF EXISTS calendar_month_folders_write ON public.calendar_month_folders;
CREATE POLICY calendar_month_folders_write ON public.calendar_month_folders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
);
