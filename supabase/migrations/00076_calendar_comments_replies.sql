-- 00076: Add parent_id to calendar_comments for threaded replies

ALTER TABLE public.calendar_comments
  ADD COLUMN parent_id UUID REFERENCES public.calendar_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_calendar_comments_parent 
  ON public.calendar_comments(parent_id) 
  WHERE parent_id IS NOT NULL;
