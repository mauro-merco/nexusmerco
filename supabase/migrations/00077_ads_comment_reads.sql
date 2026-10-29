ALTER TABLE public.comment_reads DROP CONSTRAINT IF EXISTS comment_reads_comment_type_check;
ALTER TABLE public.comment_reads ADD CONSTRAINT comment_reads_comment_type_check
  CHECK (comment_type IN ('task_comment', 'social_comment', 'ads_comment'));
