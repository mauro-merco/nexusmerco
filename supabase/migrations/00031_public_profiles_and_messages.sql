-- 00031: Public user profiles + messaging

-- Public profile fields on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS headline TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Mark documents as publishable on the profile
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Mark sticky notes as publishable on the profile
ALTER TABLE public.sticky_notes
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Messaging table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  content text not null default '',
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_recipient on public.messages(recipient_id, id);
create index idx_messages_sender on public.messages(sender_id, id);
create index idx_messages_pair on public.messages(sender_id, recipient_id, id);

alter publication supabase_realtime add table messages;