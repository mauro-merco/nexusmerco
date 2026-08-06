-- 00030: Calendar share tokens + guest commenting

-- Add share_token to clients for public calendar links
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();

-- Add guest_name to social_comments for non-logged-in visitors
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Add action_type to social_comments to track guest actions (comment, status_change, drag_move)
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'comment';

-- Index for share_token lookups
CREATE INDEX IF NOT EXISTS idx_clients_share_token ON public.clients(share_token);
