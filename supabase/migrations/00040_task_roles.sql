-- 00040: Task roles — one role per user per task
-- lead = encargado de proyecto · executor = encargado de ejecutar
-- participant = participante · reviewer = quien hace la revisión

ALTER TABLE public.task_assignees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'executor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.task_assignees'::regclass AND conname = 'task_assignees_role_check'
  ) THEN
    ALTER TABLE public.task_assignees
      ADD CONSTRAINT task_assignees_role_check CHECK (role IN ('lead', 'executor', 'participant', 'reviewer'));
  END IF;
END $$;