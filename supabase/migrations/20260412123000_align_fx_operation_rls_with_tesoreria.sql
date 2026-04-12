drop policy if exists "Secretaria can insert fx operations in current club" on public.fx_operations;
drop policy if exists "Tesoreria can insert fx operations in current club" on public.fx_operations;

create policy "Tesoreria can insert fx operations in current club"
on public.fx_operations
for insert
to authenticated
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
  and exists (
    select 1
    from public.treasury_accounts source_account
    where source_account.id = public.fx_operations.source_account_id
      and source_account.club_id = public.current_club_id()
  )
  and exists (
    select 1
    from public.treasury_accounts target_account
    where target_account.id = public.fx_operations.target_account_id
      and target_account.club_id = public.current_club_id()
  )
);
