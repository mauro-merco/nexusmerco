-- 00025: Reminders system + notifications improvements + mentions

-- Add link column to notifications (target route for click-to-navigate)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT DEFAULT '';

-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  reminder_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, reminder_at);

CREATE POLICY reminders_select ON public.reminders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY reminders_insert ON public.reminders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY reminders_update ON public.reminders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY reminders_delete ON public.reminders FOR DELETE USING (auth.role() = 'authenticated');
