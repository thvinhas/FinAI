do $$ begin
  if exists (select 1 from pg_tables where tablename = 'accounts') then
    if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'Users can manage their own accounts') then
      create policy "Users can manage their own accounts" on accounts
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
  end if;
  if exists (select 1 from pg_tables where tablename = 'categories') then
    if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'Users can manage their own categories') then
      create policy "Users can manage their own categories" on categories
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
  end if;
  if exists (select 1 from pg_tables where tablename = 'transactions') then
    if not exists (select 1 from pg_policies where tablename = 'transactions' and policyname = 'Users can manage their own transactions') then
      create policy "Users can manage their own transactions" on transactions
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
  end if;
end $$;
