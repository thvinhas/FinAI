alter table import_transfer_mappings
  add column if not exists source_account_id uuid references accounts(id) on delete set null;

create policy "Usuarios podem atualizar seus proprios mappings"
  on import_transfer_mappings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on import_transfer_mappings to anon, authenticated;
