ALTER TABLE public.tasks
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN closure_effort text CHECK (closure_effort IN ('low', 'medium', 'high', 'very_high')),
  ADD COLUMN actual_minutes integer CHECK (actual_minutes > 0),
  ADD COLUMN closure_summary text;

CREATE INDEX tasks_client_closed_at_idx ON public.tasks(client_id, closed_at DESC) WHERE status = 'cerrada';
