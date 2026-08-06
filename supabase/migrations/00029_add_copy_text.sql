-- 00029: Add copy_text to social_ideas

ALTER TABLE public.social_ideas
  ADD COLUMN IF NOT EXISTS copy_text TEXT DEFAULT '';
