-- 00013: Social Media Calendar tables

-- Social Ideas (posts planned in the calendar)
CREATE TABLE public.social_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  post_type TEXT NOT NULL CHECK (post_type IN ('historia', 'reel', 'carrusel')),
  status TEXT NOT NULL CHECK (status IN ('borrador', 'en_revision', 'aprobada')) DEFAULT 'borrador',
  publish_date DATE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.social_ideas ENABLE ROW LEVEL SECURITY;

-- Social Attachments (images, videos, links attached to ideas)
CREATE TABLE public.social_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.social_ideas(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'link')),
  url TEXT NOT NULL,
  preview_url TEXT DEFAULT '',
  name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.social_attachments ENABLE ROW LEVEL SECURITY;

-- Social Comments (comments on ideas)
CREATE TABLE public.social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.social_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

-- Social Annotations (point & click annotations on attachments)
CREATE TABLE public.social_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.social_comments(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES public.social_attachments(id) ON DELETE CASCADE,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.social_annotations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_social_ideas_client_date ON public.social_ideas(client_id, publish_date);
CREATE INDEX idx_social_comments_idea ON public.social_comments(idea_id);
CREATE INDEX idx_social_attachments_idea ON public.social_attachments(idea_id);
CREATE INDEX idx_social_annotations_comment ON public.social_annotations(comment_id);

-- RLS Policies: authenticated users can read/write
CREATE POLICY social_ideas_select ON public.social_ideas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY social_ideas_insert ON public.social_ideas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY social_ideas_update ON public.social_ideas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY social_ideas_delete ON public.social_ideas FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY social_attachments_select ON public.social_attachments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY social_attachments_insert ON public.social_attachments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY social_attachments_delete ON public.social_attachments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY social_comments_select ON public.social_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY social_comments_insert ON public.social_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY social_comments_delete ON public.social_comments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY social_annotations_select ON public.social_annotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY social_annotations_insert ON public.social_annotations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY social_annotations_delete ON public.social_annotations FOR DELETE USING (auth.role() = 'authenticated');
