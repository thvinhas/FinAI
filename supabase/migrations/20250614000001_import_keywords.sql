-- Run this in Supabase SQL Editor
create table if not exists import_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

alter table import_keywords enable row level security;

create policy "Users can manage their own keywords"
  on import_keywords for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
