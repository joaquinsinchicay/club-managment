alter table public.treasury_categories enable row level security;
alter table public.club_activities enable row level security;
alter table public.club_calendar_events enable row level security;
alter table public.receipt_formats enable row level security;
alter table public.treasury_field_rules enable row level security;
alter table public.daily_cash_session_balances enable row level security;
alter table public.balance_adjustments enable row level security;
alter table public.account_transfers enable row level security;
alter table public.fx_operations enable row level security;
alter table public.daily_consolidation_batches enable row level security;
alter table public.movement_integrations enable row level security;
alter table public.movement_audit_logs enable row level security;

drop policy if exists "Admins manage treasury currencies in current club" on public.club_treasury_currencies;
drop policy if exists "Treasury manage treasury currencies in current club" on public.club_treasury_currencies;

create policy "Treasury manage treasury currencies in current club"
on public.club_treasury_currencies
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Admins manage movement type config in current club" on public.club_movement_type_config;
drop policy if exists "Treasury manage movement type config in current club" on public.club_movement_type_config;

create policy "Treasury manage movement type config in current club"
on public.club_movement_type_config
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Members can view categories" on public.treasury_categories;
drop policy if exists "Admins manage categories in current club" on public.treasury_categories;
drop policy if exists "Treasury manage categories in current club" on public.treasury_categories;

create policy "Members can view categories"
on public.treasury_categories
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Treasury manage categories in current club"
on public.treasury_categories
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Members can view activities" on public.club_activities;
drop policy if exists "Admins manage activities in current club" on public.club_activities;
drop policy if exists "Treasury manage activities in current club" on public.club_activities;

create policy "Members can view activities"
on public.club_activities
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Treasury manage activities in current club"
on public.club_activities
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Members can view calendar events" on public.club_calendar_events;
drop policy if exists "Treasury manage calendar events in current club" on public.club_calendar_events;

create policy "Members can view calendar events"
on public.club_calendar_events
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Treasury manage calendar events in current club"
on public.club_calendar_events
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Members can view receipt formats" on public.receipt_formats;
drop policy if exists "Admins manage receipt formats in current club" on public.receipt_formats;
drop policy if exists "Treasury manage receipt formats in current club" on public.receipt_formats;

create policy "Members can view receipt formats"
on public.receipt_formats
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Treasury manage receipt formats in current club"
on public.receipt_formats
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Members can view treasury field rules" on public.treasury_field_rules;
drop policy if exists "Treasury manage treasury field rules in current club" on public.treasury_field_rules;

create policy "Members can view treasury field rules"
on public.treasury_field_rules
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Treasury manage treasury field rules in current club"
on public.treasury_field_rules
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Secretaria and tesoreria can view session balances" on public.daily_cash_session_balances;
drop policy if exists "Secretaria can insert session balances in current club" on public.daily_cash_session_balances;

create policy "Secretaria and tesoreria can view session balances"
on public.daily_cash_session_balances
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_cash_sessions
    where public.daily_cash_sessions.id = public.daily_cash_session_balances.session_id
      and public.daily_cash_sessions.club_id = public.current_club_id()
      and (
        (select public.current_user_has_role('secretaria'))
        or (select public.current_user_has_role('tesoreria'))
      )
  )
);

create policy "Secretaria can insert session balances in current club"
on public.daily_cash_session_balances
for insert
to authenticated
with check (
  exists (
    select 1
    from public.daily_cash_sessions
    where public.daily_cash_sessions.id = public.daily_cash_session_balances.session_id
      and public.daily_cash_sessions.club_id = public.current_club_id()
      and (select public.current_user_has_role('secretaria'))
  )
  and exists (
    select 1
    from public.treasury_accounts
    where public.treasury_accounts.id = public.daily_cash_session_balances.account_id
      and public.treasury_accounts.club_id = public.current_club_id()
  )
);

drop policy if exists "Secretaria and tesoreria can view balance adjustments" on public.balance_adjustments;
drop policy if exists "Secretaria can insert balance adjustments in current club" on public.balance_adjustments;

create policy "Secretaria and tesoreria can view balance adjustments"
on public.balance_adjustments
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_cash_sessions
    where public.daily_cash_sessions.id = public.balance_adjustments.session_id
      and public.daily_cash_sessions.club_id = public.current_club_id()
      and (
        (select public.current_user_has_role('secretaria'))
        or (select public.current_user_has_role('tesoreria'))
      )
  )
);

create policy "Secretaria can insert balance adjustments in current club"
on public.balance_adjustments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.daily_cash_sessions
    where public.daily_cash_sessions.id = public.balance_adjustments.session_id
      and public.daily_cash_sessions.club_id = public.current_club_id()
      and (select public.current_user_has_role('secretaria'))
  )
  and exists (
    select 1
    from public.treasury_accounts
    where public.treasury_accounts.id = public.balance_adjustments.account_id
      and public.treasury_accounts.club_id = public.current_club_id()
  )
);

drop policy if exists "Members can view account transfers" on public.account_transfers;
drop policy if exists "Secretaria can insert account transfers in current club" on public.account_transfers;

create policy "Members can view account transfers"
on public.account_transfers
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Secretaria can insert account transfers in current club"
on public.account_transfers
for insert
to authenticated
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('secretaria'))
  and exists (
    select 1
    from public.treasury_accounts source_account
    where source_account.id = public.account_transfers.source_account_id
      and source_account.club_id = public.current_club_id()
  )
  and exists (
    select 1
    from public.treasury_accounts target_account
    where target_account.id = public.account_transfers.target_account_id
      and target_account.club_id = public.current_club_id()
  )
);

drop policy if exists "Members can view fx operations" on public.fx_operations;
drop policy if exists "Secretaria can insert fx operations in current club" on public.fx_operations;

create policy "Members can view fx operations"
on public.fx_operations
for select
to authenticated
using (
  club_id = public.current_club_id()
  and public.is_member_of_current_club()
);

create policy "Secretaria can insert fx operations in current club"
on public.fx_operations
for insert
to authenticated
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('secretaria'))
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

drop policy if exists "Admin and tesoreria can view consolidation batches" on public.daily_consolidation_batches;
drop policy if exists "Tesoreria can manage consolidation batches in current club" on public.daily_consolidation_batches;

create policy "Admin and tesoreria can view consolidation batches"
on public.daily_consolidation_batches
for select
to authenticated
using (
  club_id = public.current_club_id()
  and (
    (select public.current_user_has_role('admin'))
    or (select public.current_user_has_role('tesoreria'))
  )
);

create policy "Tesoreria can manage consolidation batches in current club"
on public.daily_consolidation_batches
for all
to authenticated
using (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
)
with check (
  club_id = public.current_club_id()
  and (select public.current_user_has_role('tesoreria'))
);

drop policy if exists "Admin and tesoreria can view movement integrations" on public.movement_integrations;
drop policy if exists "Tesoreria can insert movement integrations in current club" on public.movement_integrations;

create policy "Admin and tesoreria can view movement integrations"
on public.movement_integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.treasury_movements secretaria_movement
    where secretaria_movement.id = public.movement_integrations.secretaria_movement_id
      and secretaria_movement.club_id = public.current_club_id()
      and (
        (select public.current_user_has_role('admin'))
        or (select public.current_user_has_role('tesoreria'))
      )
  )
  and exists (
    select 1
    from public.treasury_movements tesoreria_movement
    where tesoreria_movement.id = public.movement_integrations.tesoreria_movement_id
      and tesoreria_movement.club_id = public.current_club_id()
  )
);

create policy "Tesoreria can insert movement integrations in current club"
on public.movement_integrations
for insert
to authenticated
with check (
  (select public.current_user_has_role('tesoreria'))
  and exists (
    select 1
    from public.treasury_movements secretaria_movement
    where secretaria_movement.id = public.movement_integrations.secretaria_movement_id
      and secretaria_movement.club_id = public.current_club_id()
  )
  and exists (
    select 1
    from public.treasury_movements tesoreria_movement
    where tesoreria_movement.id = public.movement_integrations.tesoreria_movement_id
      and tesoreria_movement.club_id = public.current_club_id()
  )
);

drop policy if exists "Admin and tesoreria can view movement audit logs" on public.movement_audit_logs;
drop policy if exists "Admin and tesoreria can insert movement audit logs" on public.movement_audit_logs;

create policy "Admin and tesoreria can view movement audit logs"
on public.movement_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.treasury_movements
    where public.treasury_movements.id = public.movement_audit_logs.movement_id
      and public.treasury_movements.club_id = public.current_club_id()
      and (
        (select public.current_user_has_role('admin'))
        or (select public.current_user_has_role('tesoreria'))
      )
  )
);

create policy "Admin and tesoreria can insert movement audit logs"
on public.movement_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.treasury_movements
    where public.treasury_movements.id = public.movement_audit_logs.movement_id
      and public.treasury_movements.club_id = public.current_club_id()
      and (
        (select public.current_user_has_role('admin'))
        or (select public.current_user_has_role('tesoreria'))
      )
  )
);
