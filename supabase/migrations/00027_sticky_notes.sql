create table sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  content text not null default '',
  color text not null default '#fbbf24',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create index idx_sticky_notes_user_id on sticky_notes(user_id);

alter publication supabase_realtime add table sticky_notes;