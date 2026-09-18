-- Shareable links for tasks: unique token + public/private visibility
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

UPDATE public.tasks SET share_token = gen_random_uuid() WHERE share_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_share_token ON public.tasks(share_token);
