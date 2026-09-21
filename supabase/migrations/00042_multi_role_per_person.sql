-- 00042: Allow the same person to hold multiple roles in one task or calendar piece.

BEGIN;

ALTER TABLE public.task_assignees
  DROP CONSTRAINT IF EXISTS task_assignees_pkey;
ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_pkey PRIMARY KEY (task_id, user_id, role);

ALTER TABLE public.social_idea_assignees
  DROP CONSTRAINT IF EXISTS social_idea_assignees_pkey;
ALTER TABLE public.social_idea_assignees
  ADD CONSTRAINT social_idea_assignees_pkey PRIMARY KEY (idea_id, user_id, role);

ALTER TABLE public.ads_idea_assignees
  DROP CONSTRAINT IF EXISTS ads_idea_assignees_pkey;
ALTER TABLE public.ads_idea_assignees
  ADD CONSTRAINT ads_idea_assignees_pkey PRIMARY KEY (idea_id, user_id, role);

COMMIT;
