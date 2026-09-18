-- 00034: Multiple assignees per task

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_select') THEN
    CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_insert') THEN
    CREATE POLICY task_assignees_insert ON public.task_assignees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'task_assignees_delete') THEN
    CREATE POLICY task_assignees_delete ON public.task_assignees FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Backfill from the legacy single-assignee column
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assignee_id FROM public.tasks WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;
