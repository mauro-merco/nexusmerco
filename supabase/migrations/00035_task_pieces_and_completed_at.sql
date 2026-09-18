-- 00035: Piece count per task + completion timestamp (for monthly pieces reporting)

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pieces_count INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Best-effort backfill: tasks already approved before this migration didn't
-- track when that happened, so use their last update time as an approximation.
UPDATE public.tasks SET completed_at = updated_at WHERE status = 'aprobado' AND completed_at IS NULL;
