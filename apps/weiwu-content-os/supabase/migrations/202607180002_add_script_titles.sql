alter table public.scripts
  add column title text not null default '' check (char_length(trim(title)) between 1 and 160);
