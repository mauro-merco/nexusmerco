-- 00015: Expand social_ideas status with new values
-- Drops old CHECK constraint and adds new one with all 6 statuses

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;

ALTER TABLE public.social_ideas
  ADD CONSTRAINT social_ideas_status_check
  CHECK (status IN ('borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'));
