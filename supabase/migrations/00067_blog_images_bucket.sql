-- Public storage for permanent AI-generated blog images.
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('blog-images', 'blog-images', true, false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public blog images" ON storage.objects;
CREATE POLICY "Public blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');
