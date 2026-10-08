-- 00064: Integration sync audit log

CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  rows_synced INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_client_platform ON public.integration_sync_logs(client_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_created ON public.integration_sync_logs(created_at DESC);
