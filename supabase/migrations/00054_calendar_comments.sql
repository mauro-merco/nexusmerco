-- 00054: General comments on calendars (one thread per client + calendar type + month)

CREATE TABLE IF NOT EXISTS public.calendar_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('social', 'ads')),
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_comments_thread
  ON public.calendar_comments(client_id, calendar_type, month, created_at);

ALTER TABLE public.calendar_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_comments' AND policyname = 'service role full access calendar_comments') THEN
    CREATE POLICY "service role full access calendar_comments" ON public.calendar_comments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_comments' AND policyname = 'calendar_comments_staff_all') THEN
    CREATE POLICY "calendar_comments_staff_all" ON public.calendar_comments
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'operador')
        )
      );
  END IF;
END $$;
