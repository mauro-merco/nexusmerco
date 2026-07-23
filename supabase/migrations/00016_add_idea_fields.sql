-- 00016: Add responsable, brief, eje_contenido to social_ideas

ALTER TABLE public.social_ideas
  ADD COLUMN IF NOT EXISTS responsable TEXT NOT NULL DEFAULT 'mau',
  ADD COLUMN IF NOT EXISTS brief TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS eje_contenido TEXT DEFAULT '';
