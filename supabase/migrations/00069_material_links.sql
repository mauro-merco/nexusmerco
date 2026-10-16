-- 00069: Per-entity material links (tasks and ideas)

-- Self-contained: same definition as 00068, so this migration also runs
-- standalone if 00068 was not applied yet.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'));
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

CREATE TABLE IF NOT EXISTS public.material_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task','social_idea','ads_idea')),
  entity_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_links_entity ON public.material_links(entity_type, entity_id, created_at DESC);

ALTER TABLE public.material_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS material_links_staff_all ON public.material_links;
CREATE POLICY material_links_staff_all ON public.material_links
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
