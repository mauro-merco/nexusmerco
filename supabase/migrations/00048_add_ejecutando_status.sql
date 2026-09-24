-- 00048: Add 'ejecutando' status to tasks
-- The 'ejecutando' status exists in the TypeScript types and UI but was missing from the database constraint.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('en_espera', 'ejecutando', 'en_revision', 'aprobado', 'problemas', 'cerrada'));
