create table if not exists import_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  account_id uuid not null references accounts(id) on delete cascade,
  transaction_count int not null default 0,
  created_at timestamptz default now()
);

alter table import_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'import_logs' and policyname = 'Users can manage their own import logs') then
    create policy "Users can manage their own import logs" on import_logs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

grant all on import_logs to anon, authenticated, service_role;
