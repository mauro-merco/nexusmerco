ALTER TABLE social_ideas DROP CONSTRAINT IF EXISTS social_ideas_post_type_check;
ALTER TABLE social_ideas ADD CONSTRAINT social_ideas_post_type_check
  CHECK (post_type IN ('historia', 'reel', 'carrusel', 'posteo', 'sugerencia'));

ALTER TABLE ads_ideas DROP CONSTRAINT IF EXISTS ads_ideas_post_type_check;
ALTER TABLE ads_ideas ADD CONSTRAINT ads_ideas_post_type_check
  CHECK (post_type IN ('historia', 'reel', 'carrusel', 'posteo', 'sugerencia'));
