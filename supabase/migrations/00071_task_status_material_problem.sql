-- 00071: Task statuses aligned with the idea workflow + problem note + "necesitamos material del cliente"
-- The kanban and modal now offer the same statuses as ideas (plus `problemas` and `cerrada`).

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS problem_note TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS needs_client_material BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_material_note TEXT;

-- Drop the old CHECK first: it does not know the new vocabulary, so the data
-- migration below would violate it.
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Map the retired/renamed/idea-only statuses onto the new task vocabulary.
UPDATE public.tasks SET status = 'borrador'           WHERE status = 'en_espera';
UPDATE public.tasks SET status = 'listo_para_disenar'  WHERE status = 'ejecutando';
UPDATE public.tasks SET status = 'aprobada'            WHERE status IN ('aprobado', 'idea_aprobada', 'listo_para_postear', 'posteado');
UPDATE public.tasks SET status = 'necesita_modificaciones' WHERE status = 'idea_rechazada';

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN (
  'borrador',
  'en_revision',
  'espera_cliente',
  'necesita_modificaciones',
  'listo_para_disenar',
  'diseno_listo',
  'aprobada',
  'problemas',
  'cerrada'
));

ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'borrador';

-- The public share page reads tasks directly, so expose the new columns through it too.
COMMENT ON COLUMN public.tasks.problem_note IS 'Description of what is blocking the task while status = problemas';
COMMENT ON COLUMN public.tasks.needs_client_material IS 'True when the task is waiting on material from the client';
COMMENT ON COLUMN public.tasks.client_material_note IS 'What client material is needed';
