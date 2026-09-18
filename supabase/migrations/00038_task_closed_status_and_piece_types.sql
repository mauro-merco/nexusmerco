-- Per-type piece counts (historias / feed / reels) replacing the single pieces_count input,
-- and a new "cerrada" status that marks a task as finalized for client statistics.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pieces_stories INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pieces_feed INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pieces_reels INTEGER;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('en_espera', 'en_revision', 'aprobado', 'problemas', 'cerrada'));

-- Las tareas finalizadas con 'aprobado' (el estado terminal anterior) pasan a 'cerrada'
-- para conservarlas en el historial del perfil de cliente.
UPDATE public.tasks
SET status = 'cerrada',
    completed_at = COALESCE(completed_at, updated_at, created_at, now())
WHERE status = 'aprobado';
