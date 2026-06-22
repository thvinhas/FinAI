create table if not exists telegram_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  chat_id bigint,
  token text not null default gen_random_uuid()::text,
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists telegram_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  chat_id bigint not null unique,
  step text not null,
  data jsonb default '{}',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table telegram_links enable row level security;
alter table telegram_conversations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'telegram_links' and policyname = 'Users can manage their own telegram links') then
    create policy "Users can manage their own telegram links" on telegram_links
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'telegram_conversations' and policyname = 'Users can manage their own conversations') then
    create policy "Users can manage their own conversations" on telegram_conversations
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

grant all on telegram_links to anon, authenticated, service_role;
grant all on telegram_conversations to anon, authenticated, service_role;
