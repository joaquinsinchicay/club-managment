alter table public.treasury_account_currencies enable row level security;

drop policy if exists "Members can view account currencies" on public.treasury_account_currencies;
drop policy if exists "Treasury manage account currencies in current club" on public.treasury_account_currencies;

create policy "Members can view account currencies"
on public.treasury_account_currencies
for select
to authenticated
using (
  exists (
    select 1
    from public.treasury_accounts
    where public.treasury_accounts.id = public.treasury_account_currencies.account_id
      and public.treasury_accounts.club_id = public.current_club_id()
      and public.is_member_of_current_club()
  )
);

create policy "Treasury manage account currencies in current club"
on public.treasury_account_currencies
for all
to authenticated
using (
  exists (
    select 1
    from public.treasury_accounts
    where public.treasury_accounts.id = public.treasury_account_currencies.account_id
      and public.treasury_accounts.club_id = public.current_club_id()
      and (select public.current_user_has_role('tesoreria'))
  )
)
with check (
  exists (
    select 1
    from public.treasury_accounts
    where public.treasury_accounts.id = public.treasury_account_currencies.account_id
      and public.treasury_accounts.club_id = public.current_club_id()
      and (select public.current_user_has_role('tesoreria'))
  )
);
