create table if not exists import_transfer_mappings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  description text not null,
  transfer_type text not null check (transfer_type in ('origin', 'destination')),
  account_id text not null,
  created_at timestamptz default now(),
  unique(user_id, description)
);

alter table import_transfer_mappings enable row level security;

create policy "Usuarios podem ver seus proprios mappings"
  on import_transfer_mappings for select
  using (auth.uid() = user_id);

create policy "Usuarios podem inserir seus proprios mappings"
  on import_transfer_mappings for insert
  with check (auth.uid() = user_id);

create policy "Usuarios podem deletar seus proprios mappings"
  on import_transfer_mappings for delete
  using (auth.uid() = user_id);

grant select, insert, delete on import_transfer_mappings to anon, authenticated;
