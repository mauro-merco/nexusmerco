-- 00072: "Visto" (read marks) on task and social comments/replies
-- comment_type: 'task_comment' -> public.task_comments.id
--               'social_comment' -> public.social_comments.id

CREATE TABLE IF NOT EXISTS public.comment_reads (
  comment_type TEXT NOT NULL CHECK (comment_type IN ('task_comment', 'social_comment')),
  comment_id   UUID NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_type, comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reads_comment
  ON public.comment_reads (comment_type, comment_id);

COMMENT ON TABLE public.comment_reads IS
  'Marcas de "visto" por usuario sobre cada comentario/respuesta de tareas (task_comment) e ideas (social_comment)';

ALTER TABLE public.comment_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_reads_select ON public.comment_reads;
CREATE POLICY comment_reads_select ON public.comment_reads
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS comment_reads_insert ON public.comment_reads;
CREATE POLICY comment_reads_insert ON public.comment_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS comment_reads_delete ON public.comment_reads;
CREATE POLICY comment_reads_delete ON public.comment_reads
  FOR DELETE USING (auth.uid() = user_id OR public.is_staff());
