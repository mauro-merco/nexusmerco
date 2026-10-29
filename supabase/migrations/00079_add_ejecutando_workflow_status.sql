-- Extend the current workflows without rewriting existing statuses or data.
BEGIN;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN (
  'borrador', 'en_revision', 'espera_cliente', 'necesita_modificaciones',
  'listo_para_disenar', 'ejecutando', 'diseno_listo', 'aprobada', 'problemas', 'cerrada'
));

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;
ALTER TABLE public.social_ideas ADD CONSTRAINT social_ideas_status_check CHECK (status IN (
  'borrador', 'en_revision', 'espera_cliente', 'necesita_modificaciones',
  'idea_aprobada', 'idea_rechazada', 'listo_para_disenar', 'ejecutando',
  'diseno_listo', 'aprobada', 'listo_para_postear', 'programando', 'posteado'
));

ALTER TABLE public.ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_status_check;
ALTER TABLE public.ads_ideas ADD CONSTRAINT ads_ideas_status_check CHECK (status IN (
  'borrador', 'en_revision', 'espera_cliente', 'necesita_modificaciones',
  'idea_aprobada', 'idea_rechazada', 'listo_para_disenar', 'ejecutando',
  'diseno_listo', 'aprobada', 'listo_para_postear', 'programando', 'posteado'
));

COMMIT;
