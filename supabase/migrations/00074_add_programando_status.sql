-- 00074: Add "programando" status to calendar ideas (Redes + ADS)
-- Recreates the CHECK constraints on social_ideas and ads_ideas to include the
-- new status between "listo_para_postear" and "posteado".

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;
ALTER TABLE public.social_ideas ADD CONSTRAINT social_ideas_status_check CHECK (
  status IN ('borrador','en_revision','espera_cliente','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','programando','posteado')
);

ALTER TABLE public.ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_status_check;
ALTER TABLE public.ads_ideas ADD CONSTRAINT ads_ideas_status_check CHECK (
  status IN ('borrador','en_revision','espera_cliente','necesita_modificaciones','idea_aprobada','idea_rechazada','listo_para_disenar','diseno_listo','aprobada','listo_para_postear','programando','posteado')
);
