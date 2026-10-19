-- 00073: Exhaustive activity history.
-- One append-only event log per client (area = tareas / redes / ads / general)
-- used by the client profile (Centro de Control) and the per-user history in the
-- Team zone. Events are written by the application APIs (they know the actor).

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('task', 'social', 'ads', 'general')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_title TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  from_value TEXT,
  to_value TEXT,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_client ON public.activity_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_area ON public.activity_events(area, created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_events' AND policyname = 'activity_events_service') THEN
    CREATE POLICY "activity_events_service" ON public.activity_events
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_events' AND policyname = 'activity_events_staff_select') THEN
    CREATE POLICY "activity_events_staff_select" ON public.activity_events
      FOR SELECT USING (public.is_staff());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Backfill: seed the log with the history that already exists in the tables.
-- Only "what the row timestamps can prove" is reconstructed (creation,
-- completion and comments). Status transitions / assignment changes are only
-- recorded from now on by the APIs.
-- ---------------------------------------------------------------------------

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT t.client_id, 'task', 'task', t.id, t.title, 'created', 'Creó la tarea', t.author_id, t.created_at
FROM public.tasks t
WHERE t.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT t.client_id, 'task', 'task', t.id, t.title, 'completed', 'Completó la tarea', t.author_id, t.completed_at
FROM public.tasks t
WHERE t.completed_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT t.client_id, 'task', 'task', c.task_id, t.title, 'commented', LEFT(c.content, 200), c.user_id, c.created_at
FROM public.task_comments c
JOIN public.tasks t ON t.id = c.task_id
WHERE c.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT s.client_id, 'social', 'social_idea', s.id, s.title, 'created', 'Creó la idea de Redes', s.author_id, s.created_at
FROM public.social_ideas s
WHERE s.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT s.client_id, 'social', 'social_idea', s.id, s.title, 'completed', 'Publicó la idea', s.author_id, s.completed_at
FROM public.social_ideas s
WHERE s.completed_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT s.client_id, 'social', 'social_idea', c.idea_id, s.title, 'commented', LEFT(c.content, 200), c.user_id, c.created_at
FROM public.social_comments c
JOIN public.social_ideas s ON s.id = c.idea_id
WHERE c.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT a.client_id, 'ads', 'ads_idea', a.id, a.title, 'created', 'Creó la idea de ADS', a.author_id, a.created_at
FROM public.ads_ideas a
WHERE a.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT a.client_id, 'ads', 'ads_idea', a.id, a.title, 'completed', 'Publicó la pieza de ADS', a.author_id, a.completed_at
FROM public.ads_ideas a
WHERE a.completed_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT a.client_id, 'ads', 'ads_idea', c.idea_id, a.title, 'commented', LEFT(c.content, 200), c.user_id, c.created_at
FROM public.ads_comments c
JOIN public.ads_ideas a ON a.id = c.idea_id
WHERE c.created_at IS NOT NULL;

INSERT INTO public.activity_events (client_id, area, entity_type, entity_id, entity_title, action, detail, actor_id, created_at)
SELECT cc.client_id, 'general', 'calendar', NULL, NULL, 'commented', LEFT(cc.content, 200), cc.user_id, cc.created_at
FROM public.calendar_comments cc
WHERE cc.created_at IS NOT NULL;
