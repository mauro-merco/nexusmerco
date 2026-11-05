-- 00081: Salas (Discord-style rooms) + participation log.
--
-- Two kinds of rooms:
--   * boletin -> announcement channels. Staff publishes, everyone reads,
--     reacts, marks as seen and replies in threads.
--   * chat    -> open conversation rooms for all users.
-- Every interaction (join/leave, message, reply, reaction, view) is appended to
-- public.sala_participation so each user profile can show a full history.

CREATE TABLE IF NOT EXISTS public.salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'boletin')),
  visibility TEXT NOT NULL DEFAULT 'publica' CHECK (visibility IN ('publica', 'privada')),
  emoji TEXT NOT NULL DEFAULT '💬',
  color TEXT NOT NULL DEFAULT 'cyan',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sala_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID NOT NULL REFERENCES public.salas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sala_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sala_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID NOT NULL REFERENCES public.salas(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES public.sala_messages(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sala_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.sala_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.sala_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.sala_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- Append-only participation history. `sala_name` is stored as a snapshot so the
-- history survives if the room is removed.
CREATE TABLE IF NOT EXISTS public.sala_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID REFERENCES public.salas(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.sala_messages(id) ON DELETE SET NULL,
  sala_name TEXT NOT NULL DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  emoji TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sala_members_user ON public.sala_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sala_members_sala ON public.sala_members(sala_id);
CREATE INDEX IF NOT EXISTS idx_sala_messages_sala ON public.sala_messages(sala_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_messages_parent ON public.sala_messages(parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sala_reactions_message ON public.sala_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_sala_reactions_user ON public.sala_reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_reads_message ON public.sala_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_sala_reads_user ON public.sala_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_participation_user ON public.sala_participation(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_participation_sala ON public.sala_participation(sala_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sala_participation_action ON public.sala_participation(action, created_at DESC);

-- updated_at trigger for rooms
DROP TRIGGER IF EXISTS update_salas_updated_at ON public.salas;
CREATE TRIGGER update_salas_updated_at
  BEFORE UPDATE ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: the app talks to these tables through the service role. Direct clients
-- (if any) can only read what they are allowed to read.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_sala_member(target_sala_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sala_members m
    WHERE m.sala_id = target_sala_id AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_sala_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sala_member(UUID) TO authenticated;

ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_participation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salas_select ON public.salas;
CREATE POLICY salas_select ON public.salas
  FOR SELECT USING (
    visibility = 'publica'
    OR public.is_sala_member(id)
    OR public.is_staff()
  );

DROP POLICY IF EXISTS sala_members_select ON public.sala_members;
CREATE POLICY sala_members_select ON public.sala_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_sala_member(sala_id)
    OR public.is_staff()
  );

DROP POLICY IF EXISTS sala_messages_select ON public.sala_messages;
CREATE POLICY sala_messages_select ON public.sala_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.salas s
      WHERE s.id = sala_messages.sala_id
        AND (s.visibility = 'publica' OR public.is_sala_member(s.id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS sala_reactions_select ON public.sala_reactions;
CREATE POLICY sala_reactions_select ON public.sala_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sala_messages m
      JOIN public.salas s ON s.id = m.sala_id
      WHERE m.id = sala_reactions.message_id
        AND (s.visibility = 'publica' OR public.is_sala_member(s.id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS sala_reads_select ON public.sala_reads;
CREATE POLICY sala_reads_select ON public.sala_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sala_messages m
      JOIN public.salas s ON s.id = m.sala_id
      WHERE m.id = sala_reads.message_id
        AND (s.visibility = 'publica' OR public.is_sala_member(s.id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS sala_participation_select ON public.sala_participation;
CREATE POLICY sala_participation_select ON public.sala_participation
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed a couple of public rooms so the section is not empty on first load.
INSERT INTO public.salas (name, description, kind, visibility, emoji, color, position)
SELECT 'Anuncios generales', 'Novedades, comunicados y avisos para todo el equipo.', 'boletin', 'publica', '📣', 'amber', 0
WHERE NOT EXISTS (SELECT 1 FROM public.salas WHERE name = 'Anuncios generales');

INSERT INTO public.salas (name, description, kind, visibility, emoji, color, position)
SELECT 'Café general', 'Charlas, consultas rápidas y todo lo que no entra en una tarea.', 'chat', 'publica', '☕', 'cyan', 1
WHERE NOT EXISTS (SELECT 1 FROM public.salas WHERE name = 'Café general');
