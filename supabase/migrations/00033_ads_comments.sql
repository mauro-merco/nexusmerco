-- Comments for ads ideas (same structure as social_comments)
CREATE TABLE IF NOT EXISTS ads_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES ads_ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES ads_comments(id) ON DELETE CASCADE,
  guest_name TEXT,
  action_type TEXT DEFAULT 'comment',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ads_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ads_comments' AND policyname = 'service role full access ads_comments') THEN
    CREATE POLICY "service role full access ads_comments" ON ads_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
