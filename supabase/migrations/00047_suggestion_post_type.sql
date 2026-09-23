-- 00047: Add suggestion as calendar post type

ALTER TABLE public.social_ideas DROP CONSTRAINT IF EXISTS social_ideas_post_type_check;
ALTER TABLE public.social_ideas
  ADD CONSTRAINT social_ideas_post_type_check
  CHECK (post_type IN ('historia', 'reel', 'carrusel', 'sugerencia'));
