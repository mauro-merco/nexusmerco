-- 00070: Message groups (group conversations)

CREATE TABLE IF NOT EXISTS public.message_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_group_members_user ON public.message_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_message_group_members_group ON public.message_group_members(group_id);

-- Group messages live in the same table: recipient_id becomes optional and
-- group_id points at the conversation.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.message_groups(id) ON DELETE CASCADE;
ALTER TABLE public.messages ALTER COLUMN recipient_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_group ON public.messages(group_id, created_at DESC);

ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.message_group_members m
    WHERE m.group_id = target_group_id AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;

DROP POLICY IF EXISTS message_groups_member_select ON public.message_groups;
CREATE POLICY message_groups_member_select ON public.message_groups
  FOR SELECT USING (public.is_group_member(id));

DROP POLICY IF EXISTS message_group_members_member_select ON public.message_group_members;
CREATE POLICY message_group_members_member_select ON public.message_group_members
  FOR SELECT USING (public.is_group_member(group_id) OR user_id = auth.uid());

-- Let group members read their group's messages through PostgREST too.
DROP POLICY IF EXISTS messages_participant_select ON public.messages;
CREATE POLICY messages_participant_select ON public.messages
  FOR SELECT USING (
    auth.uid() IN (sender_id, recipient_id)
    OR (group_id IS NOT NULL AND public.is_group_member(group_id))
  );
