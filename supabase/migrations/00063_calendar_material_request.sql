-- 00063: Calendar material request + diseno listo status

ALTER TABLE public.social_ideas
ADD COLUMN IF NOT EXISTS needs_client_material BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS client_material_note TEXT DEFAULT '';

ALTER TABLE public.ads_ideas
ADD COLUMN IF NOT EXISTS needs_client_material BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS client_material_note TEXT DEFAULT '';

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;
ALTER TABLE public.social_ideas ADD CONSTRAINT social_ideas_status_check CHECK (status IN ('borrador','en_revision','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','posteado'));

ALTER TABLE public.ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_status_check;
ALTER TABLE public.ads_ideas ADD CONSTRAINT ads_ideas_status_check CHECK (status IN ('borrador','en_revision','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','posteado'));
