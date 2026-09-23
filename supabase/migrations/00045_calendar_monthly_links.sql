-- 00045: Monthly calendar share links with client-scoped guest access

CREATE TABLE IF NOT EXISTS public.calendar_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('social', 'ads')),
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  allowed_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, calendar_type, month)
);

CREATE INDEX IF NOT EXISTS idx_calendar_share_links_token ON public.calendar_share_links(token);
CREATE INDEX IF NOT EXISTS idx_calendar_share_links_client_month ON public.calendar_share_links(client_id, calendar_type, month);

ALTER TABLE public.calendar_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_share_links_admin_all" ON public.calendar_share_links;
CREATE POLICY "calendar_share_links_admin_all" ON public.calendar_share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operador')
    )
  );
