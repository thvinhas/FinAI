create table if not exists accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'cash', 'credit')),
  balance numeric not null default 0,
  color text not null default '#6366f1',
  created_at timestamptz default now(),
  archived_at timestamptz
);

create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  name text not null,
  type text not null check (type in ('receita', 'despesa')),
  color text not null default '#6366f1',
  icon text not null default 'tag',
  created_at timestamptz default now(),
  archived_at timestamptz
);

create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  account_id uuid,
  category_id uuid,
  amount numeric not null default 0,
  type text not null check (type in ('receita', 'despesa', 'transferencia')),
  description text,
  date date,
  destination_account_id uuid,
  created_at timestamptz default now(),

  constraint transactions_account_id_fkey
    foreign key (account_id) references accounts(id) on delete set null,
  constraint transactions_destination_account_id_fkey
    foreign key (destination_account_id) references accounts(id) on delete set null,
  constraint transactions_category_id_fkey
    foreign key (category_id) references categories(id) on delete set null
);

-- RLS
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

-- Policies (avoid duplicates)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'Users can manage their own accounts') then
    create policy "Users can manage their own accounts" on accounts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'Users can manage their own categories') then
    create policy "Users can manage their own categories" on categories
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'transactions' and policyname = 'Users can manage their own transactions') then
    create policy "Users can manage their own transactions" on transactions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Grants
grant all on accounts to anon, authenticated, service_role;
grant all on categories to anon, authenticated, service_role;
grant all on transactions to anon, authenticated, service_role;
