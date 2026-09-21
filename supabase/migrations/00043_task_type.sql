-- 00043: Add a task type (classified by marketing-agency categories) to tasks.

BEGIN;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT;

COMMIT;