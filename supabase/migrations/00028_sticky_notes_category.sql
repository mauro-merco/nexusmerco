alter table sticky_notes add column if not exists category text not null default '';
create index if not exists idx_sticky_notes_category on sticky_notes(category);
