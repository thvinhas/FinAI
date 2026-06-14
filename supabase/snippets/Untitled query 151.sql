create table public.transactions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  category_id uuid null,
  amount numeric(12, 2) not null,
  type text not null,
  description text not null,
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone null default now(),
  account_id uuid null,
  destination_account_id uuid null,
  constraint transactions_pkey primary key (id),
  constraint transactions_category_id_fkey foreign KEY (category_id) references categories (id) on delete set null,
  constraint transactions_account_id_fkey foreign KEY (account_id) references accounts (id) on delete set null,
  constraint transactions_destination_account_id_fkey foreign KEY (destination_account_id) references accounts (id) on delete set null,
  constraint transactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint transactions_type_check check (
    (
      type = any (
        array[
          'receita'::text,
          'despesa'::text,
          'transferencia'::text
        ]
      )
    )
  ),
  constraint transactions_amount_check check ((amount > (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_transactions_user_date on public.transactions using btree (user_id, date desc) TABLESPACE pg_default;

create index IF not exists idx_transactions_account on public.transactions using btree (account_id) TABLESPACE pg_default;
