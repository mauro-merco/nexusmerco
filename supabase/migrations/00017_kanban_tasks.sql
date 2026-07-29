-- 00017: Kanban Tasks system
-- Alters existing tasks table to add new columns and status values

-- Add new columns to existing tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Drop old status check and add new one
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('en_espera', 'en_revision', 'aprobado', 'problemas'));
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'en_espera';

-- Migrate old status values to new ones
UPDATE public.tasks SET status = 'en_espera' WHERE status = 'todo';
UPDATE public.tasks SET status = 'en_revision' WHERE status = 'in-progress';
UPDATE public.tasks SET status = 'aprobado' WHERE status = 'done';

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'link',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_task ON public.notifications(task_id);

-- Drop old policies if they exist, then create new ones
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY tasks_delete ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY task_comments_select ON public.task_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY task_comments_delete ON public.task_comments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY task_attachments_select ON public.task_attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY task_attachments_insert ON public.task_attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY task_attachments_delete ON public.task_attachments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY notifications_insert ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY notifications_delete ON public.notifications FOR DELETE USING (auth.role() = 'authenticated');
