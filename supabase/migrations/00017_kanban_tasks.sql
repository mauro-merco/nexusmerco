-- 00017: Kanban Tasks system

-- Task status enum-like check
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('en_espera', 'en_revision', 'aprobado', 'problemas')) DEFAULT 'en_espera',
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'link',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
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
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_task ON public.notifications(task_id);

-- RLS Policies
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
