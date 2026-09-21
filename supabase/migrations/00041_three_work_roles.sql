-- 00041: Three shared work roles for tasks, social pieces and ADS pieces.
-- Each element can have many users per role, while each user has one role per element.

BEGIN;

ALTER TABLE public.task_assignees
  DROP CONSTRAINT IF EXISTS task_assignees_role_check;

UPDATE public.task_assignees
SET role = 'executor'
WHERE role = 'participant';

ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_role_check
  CHECK (role IN ('lead', 'executor', 'reviewer'));

ALTER TABLE public.social_ideas
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.ads_ideas
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.social_ideas
SET completed_at = COALESCE(updated_at, publish_date::timestamptz)
WHERE status = 'posteado' AND completed_at IS NULL;

UPDATE public.ads_ideas
SET completed_at = COALESCE(updated_at, publish_date::timestamptz)
WHERE status = 'posteado' AND completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.social_idea_assignees (
  idea_id UUID NOT NULL REFERENCES public.social_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'executor' CHECK (role IN ('lead', 'executor', 'reviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.ads_idea_assignees (
  idea_id UUID NOT NULL REFERENCES public.ads_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'executor' CHECK (role IN ('lead', 'executor', 'reviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_idea_assignees_user ON public.social_idea_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_idea_assignees_user ON public.ads_idea_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_social_ideas_client_completed ON public.social_ideas(client_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_ads_ideas_client_completed ON public.ads_ideas(client_id, completed_at);

ALTER TABLE public.social_idea_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_idea_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages social idea assignees" ON public.social_idea_assignees;
CREATE POLICY "Service role manages social idea assignees" ON public.social_idea_assignees
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages ads idea assignees" ON public.ads_idea_assignees;
CREATE POLICY "Service role manages ads idea assignees" ON public.ads_idea_assignees
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;
