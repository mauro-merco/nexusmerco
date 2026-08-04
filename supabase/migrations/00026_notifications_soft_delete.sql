-- 00026: Notifications soft delete
-- Notifications can be "deleted" (soft delete) and land in a deleted bucket.
-- They auto-purge 30 days after being deleted and cannot be removed permanently.

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_deleted ON public.notifications(user_id, deleted_at);
