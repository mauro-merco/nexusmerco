alter table sticky_notes add column if not exists category text not null default '';
alter table sticky_notes add column if not exists category_color text;
