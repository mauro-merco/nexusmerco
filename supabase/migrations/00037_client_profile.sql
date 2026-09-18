-- Client profile: link documents to a client, and an internal team wall per client
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);

CREATE TABLE IF NOT EXISTS public.client_wall_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.client_wall_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client wall messages"
  ON public.client_wall_messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert client wall messages"
  ON public.client_wall_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own client wall messages"
  ON public.client_wall_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_client_wall_messages_client_id ON public.client_wall_messages(client_id);
