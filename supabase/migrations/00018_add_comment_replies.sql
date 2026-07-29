-- 00018: Add reply support to comments

-- Add parent_id to social_comments for threaded replies
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.social_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_social_comments_parent ON public.social_comments(parent_id);

-- Add parent_id to task_comments for threaded replies
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON public.task_comments(parent_id);
