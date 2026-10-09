-- 00065: Calendar waiting client status + general folders

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;
ALTER TABLE public.social_ideas ADD CONSTRAINT social_ideas_status_check CHECK (status IN ('borrador','en_revision','espera_cliente','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','posteado'));

ALTER TABLE public.ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_status_check;
ALTER TABLE public.ads_ideas ADD CONSTRAINT ads_ideas_status_check CHECK (status IN ('borrador','en_revision','espera_cliente','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','posteado'));

CREATE TABLE IF NOT EXISTS public.calendar_general_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  folder_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_general_folders_client ON public.calendar_general_folders(client_id, created_at DESC);
