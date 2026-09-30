-- 00055: Adds the idea review states and the design step to the idea workflow
-- Drops the old CHECK constraint and adds the new one with all 9 statuses
--
-- Flow:
--   Borrador -> En Revision -> (Necesita Modificaciones | Idea Aprobada | Idea Rechazada)
--   -> Listo para Disenar -> Aprobado -> Listo para postear -> Publicado

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_status_check;

ALTER TABLE public.social_ideas
  ADD CONSTRAINT social_ideas_status_check
  CHECK (status IN (
    'borrador',
    'en_revision',
    'necesita_modificaciones',
    'idea_aprobada',
    'idea_rechazada',
    'listo_para_disenar',
    'aprobada',
    'listo_para_postear',
    'posteado'
  ));

-- ads_ideas.status is free TEXT today; aligned here so both calendars reject
-- the same invalid values if a constraint is ever added.
ALTER TABLE public.ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_status_check;
