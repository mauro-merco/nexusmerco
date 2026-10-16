-- Emergency security hardening: direct PostgREST access must follow the same
-- ownership and client boundaries as the application APIs.

CREATE OR REPLACE FUNCTION public.has_client_access(target_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.client_id = target_client_id
        OR target_client_id::TEXT = ANY(COALESCE(u.allowed_client_ids, ARRAY[]::TEXT[]))
        OR (u.role IN ('admin', 'operador') AND u.allowed_client_ids IS NULL)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'));
$$;

REVOKE ALL ON FUNCTION public.has_client_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_client_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- Prevent direct role/client/2FA escalation through the users table.
REVOKE SELECT, UPDATE ON public.users FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, bio, headline, is_public) ON public.users TO authenticated;
GRANT UPDATE (full_name, avatar_url, bio, headline, is_public) ON public.users TO authenticated;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update safe own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tables previously created without RLS are server-only unless a policy below
-- explicitly grants participant access.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_general_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_participant_select ON public.messages;
DROP POLICY IF EXISTS messages_sender_insert ON public.messages;
DROP POLICY IF EXISTS messages_participant_update ON public.messages;
DROP POLICY IF EXISTS messages_participant_delete ON public.messages;
CREATE POLICY messages_participant_select ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY messages_sender_insert ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY messages_participant_update ON public.messages FOR UPDATE USING (auth.uid() IN (sender_id, recipient_id)) WITH CHECK (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY messages_participant_delete ON public.messages FOR DELETE USING (auth.uid() IN (sender_id, recipient_id));

DROP POLICY IF EXISTS sticky_notes_owner_all ON public.sticky_notes;
CREATE POLICY sticky_notes_owner_all ON public.sticky_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Replace organization-wide task/notification/reminder policies.
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_select ON public.tasks FOR SELECT USING (public.has_client_access(client_id));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (public.has_client_access(client_id) AND author_id = auth.uid());
CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING (public.has_client_access(client_id)) WITH CHECK (public.has_client_access(client_id));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE USING (public.is_staff() AND public.has_client_access(client_id));

DROP POLICY IF EXISTS task_comments_select ON public.task_comments;
DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
DROP POLICY IF EXISTS task_comments_delete ON public.task_comments;
CREATE POLICY task_comments_select ON public.task_comments FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_comments_delete ON public.task_comments FOR DELETE USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS task_attachments_select ON public.task_attachments;
DROP POLICY IF EXISTS task_attachments_insert ON public.task_attachments;
DROP POLICY IF EXISTS task_attachments_delete ON public.task_attachments;
CREATE POLICY task_attachments_select ON public.task_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_attachments_insert ON public.task_attachments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_attachments_delete ON public.task_attachments FOR DELETE USING (public.is_staff());

DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_delete ON public.notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_select ON public.reminders;
DROP POLICY IF EXISTS reminders_insert ON public.reminders;
DROP POLICY IF EXISTS reminders_update ON public.reminders;
DROP POLICY IF EXISTS reminders_delete ON public.reminders;
CREATE POLICY reminders_select ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reminders_insert ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reminders_update ON public.reminders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY reminders_delete ON public.reminders FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS task_assignees_select ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_insert ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_delete ON public.task_assignees;
CREATE POLICY task_assignees_select ON public.task_assignees FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_assignees_insert ON public.task_assignees FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
CREATE POLICY task_assignees_delete ON public.task_assignees FOR DELETE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_client_access(t.client_id)));
