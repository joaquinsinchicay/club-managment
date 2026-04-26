-- =========================================
-- ENABLE RLS
-- =========================================

alter table users enable row level security;
alter table clubs enable row level security;
alter table memberships enable row level security;
alter table membership_roles enable row level security;
alter table club_invitations enable row level security;
alter table user_club_preferences enable row level security;
alter table treasury_accounts enable row level security;
alter table treasury_account_currencies enable row level security;
alter table treasury_categories enable row level security;
alter table club_activities enable row level security;
alter table club_calendar_events enable row level security;
alter table receipt_formats enable row level security;
alter table club_treasury_currencies enable row level security;
alter table club_movement_type_config enable row level security;
alter table treasury_movements enable row level security;
alter table daily_cash_sessions enable row level security;
alter table daily_cash_session_balances enable row level security;
alter table balance_adjustments enable row level security;
alter table account_transfers enable row level security;
alter table fx_operations enable row level security;
alter table daily_consolidation_batches enable row level security;
alter table movement_integrations enable row level security;
alter table movement_audit_logs enable row level security;
alter table cost_centers enable row level security;
alter table treasury_movement_cost_centers enable row level security;
alter table cost_center_audit_log enable row level security;

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

create or replace function current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function current_user_email()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'email';
$$;

create or replace function current_club_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_club_id', true), '')::uuid;
$$;

create or replace function current_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array(
      select mr.role::text
      from membership_roles mr
      join memberships m on m.id = mr.membership_id
      where m.user_id = auth.uid()
        and m.club_id = current_club_id()
        and m.status = 'activo'
      order by array_position(array['admin', 'secretaria', 'tesoreria']::text[], mr.role::text)
    ),
    array[]::text[]
  );
$$;

create or replace function current_user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select required_role = any(current_user_roles());
$$;

create or replace function is_member_of_current_club()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships
    where user_id = auth.uid()
      and club_id = current_club_id()
      and status = 'activo'
  );
$$;

-- =========================================
-- USERS
-- =========================================

drop policy if exists "Users can see themselves" on users;
drop policy if exists "Admins can see users of current club" on users;
drop policy if exists "Users can insert themselves" on users;
drop policy if exists "Users can update themselves" on users;

create policy "Users can see themselves"
on users
for select
to authenticated
using (id = current_user_id());

create policy "Admins can see users of current club"
on users
for select
to authenticated
using (
  (select current_user_has_role('admin'))
  and exists (
    select 1
    from memberships
    where memberships.user_id = users.id
      and memberships.club_id = current_club_id()
  )
);

create policy "Users can insert themselves"
on users
for insert
to authenticated
with check (
  id = current_user_id()
  and email = current_user_email()
);

create policy "Users can update themselves"
on users
for update
to authenticated
using (id = current_user_id())
with check (
  id = current_user_id()
  and email = current_user_email()
);

-- =========================================
-- CLUBS
-- =========================================

drop policy if exists "User can see their clubs" on clubs;

create policy "User can see their clubs"
on clubs
for select
to authenticated
using (
  exists (
    select 1
    from memberships
    where memberships.club_id = clubs.id
      and memberships.user_id = current_user_id()
      and memberships.status = 'activo'
  )
);

drop policy if exists "Admins can update their club identity" on clubs;

create policy "Admins can update their club identity"
on clubs
for update
to authenticated
using (
  exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.club_id = clubs.id
      and m.status = 'activo'
      and mr.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.club_id = clubs.id
      and m.status = 'activo'
      and mr.role = 'admin'
  )
);

-- =========================================
-- STORAGE · bucket club-logos
-- =========================================
-- Lectura publica del logo del club; la escritura solo la permite un admin
-- cuyo club_id coincida con el primer segmento del path del objeto.

drop policy if exists "club_logos_public_read" on storage.objects;
create policy "club_logos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'club-logos');

drop policy if exists "club_logos_admin_insert" on storage.objects;
create policy "club_logos_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-logos'
  and exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.status = 'activo'
      and mr.role = 'admin'
      and m.club_id::text = split_part(storage.objects.name, '/', 1)
  )
);

drop policy if exists "club_logos_admin_update" on storage.objects;
create policy "club_logos_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-logos'
  and exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.status = 'activo'
      and mr.role = 'admin'
      and m.club_id::text = split_part(storage.objects.name, '/', 1)
  )
);

drop policy if exists "club_logos_admin_delete" on storage.objects;
create policy "club_logos_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-logos'
  and exists (
    select 1
    from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.status = 'activo'
      and mr.role = 'admin'
      and m.club_id::text = split_part(storage.objects.name, '/', 1)
  )
);

-- =========================================
-- MEMBERSHIPS
-- =========================================

drop policy if exists "Users can see own memberships" on memberships;
drop policy if exists "Admins manage memberships in current club" on memberships;
drop policy if exists "Users can remove own memberships" on memberships;
drop policy if exists "Users can create own memberships from invitations" on memberships;

create policy "Users can see own memberships"
on memberships
for select
to authenticated
using (user_id = current_user_id());

create policy "Users can create own memberships from invitations"
on memberships
for insert
to authenticated
with check (
  user_id = current_user_id()
  and exists (
    select 1
    from club_invitations
    where club_invitations.club_id = memberships.club_id
      and club_invitations.email = current_user_email()
      and club_invitations.status = 'pending'
      and club_invitations.used_at is null
  )
);

create policy "Admins manage memberships in current club"
on memberships
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

create policy "Users can remove own memberships"
on memberships
for delete
to authenticated
using (user_id = current_user_id());

-- =========================================
-- MEMBERSHIP ROLES
-- =========================================

drop policy if exists "Users can see own membership roles" on membership_roles;
drop policy if exists "Admins manage membership roles in current club" on membership_roles;
drop policy if exists "Users can insert own membership roles from invitations" on membership_roles;

create policy "Users can see own membership roles"
on membership_roles
for select
to authenticated
using (
  exists (
    select 1
    from memberships
    where memberships.id = membership_roles.membership_id
      and memberships.user_id = current_user_id()
  )
);

create policy "Users can insert own membership roles from invitations"
on membership_roles
for insert
to authenticated
with check (
  exists (
    select 1
    from memberships
    where memberships.id = membership_roles.membership_id
      and memberships.user_id = current_user_id()
      and exists (
        select 1
        from club_invitations
        where club_invitations.club_id = memberships.club_id
          and club_invitations.email = current_user_email()
          and club_invitations.role = membership_roles.role
          and club_invitations.status = 'pending'
          and club_invitations.used_at is null
      )
  )
);

create policy "Admins manage membership roles in current club"
on membership_roles
for all
to authenticated
using (
  exists (
    select 1
    from memberships
    where memberships.id = membership_roles.membership_id
      and memberships.club_id = current_club_id()
      and (select current_user_has_role('admin'))
  )
)
with check (
  exists (
    select 1
    from memberships
    where memberships.id = membership_roles.membership_id
      and memberships.club_id = current_club_id()
      and (select current_user_has_role('admin'))
  )
);

-- =========================================
-- CLUB INVITATIONS
-- =========================================

drop policy if exists "Admins manage invitations in current club" on club_invitations;
drop policy if exists "Users can see own pending invitations" on club_invitations;
drop policy if exists "Users can consume own invitations" on club_invitations;

create policy "Users can see own pending invitations"
on club_invitations
for select
to authenticated
using (
  email = current_user_email()
);

create policy "Users can consume own invitations"
on club_invitations
for update
to authenticated
using (
  email = current_user_email()
)
with check (
  email = current_user_email()
);

create policy "Admins manage invitations in current club"
on club_invitations
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- =========================================
-- USER CLUB PREFERENCES
-- =========================================

drop policy if exists "Users can manage own club preferences" on user_club_preferences;

create policy "Users can manage own club preferences"
on user_club_preferences
for all
to authenticated
using (user_id = current_user_id())
with check (user_id = current_user_id());

-- =========================================
-- TREASURY ACCOUNTS
-- =========================================

drop policy if exists "Members can view accounts" on treasury_accounts;
drop policy if exists "Admins manage accounts in current club" on treasury_accounts;
drop policy if exists "Treasury manage accounts in current club" on treasury_accounts;

create policy "Members can view accounts"
on treasury_accounts
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage accounts in current club"
on treasury_accounts
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- TREASURY ACCOUNT CURRENCIES
-- =========================================

drop policy if exists "Members can view account currencies" on treasury_account_currencies;
drop policy if exists "Treasury manage account currencies in current club" on treasury_account_currencies;

create policy "Members can view account currencies"
on treasury_account_currencies
for select
to authenticated
using (
  exists (
    select 1
    from treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and is_member_of_current_club()
  )
);

create policy "Treasury manage account currencies in current club"
on treasury_account_currencies
for all
to authenticated
using (
  exists (
    select 1
    from treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  )
)
with check (
  exists (
    select 1
    from treasury_accounts
    where treasury_accounts.id = treasury_account_currencies.account_id
      and treasury_accounts.club_id = current_club_id()
      and (select current_user_has_role('tesoreria'))
  )
);

-- =========================================
-- CLUB TREASURY CURRENCIES
-- =========================================

drop policy if exists "Members can view treasury currencies" on club_treasury_currencies;
drop policy if exists "Admins manage treasury currencies in current club" on club_treasury_currencies;
drop policy if exists "Treasury manage treasury currencies in current club" on club_treasury_currencies;

create policy "Members can view treasury currencies"
on club_treasury_currencies
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage treasury currencies in current club"
on club_treasury_currencies
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- MOVEMENT TYPE CONFIG
-- =========================================

drop policy if exists "Members can view movement type config" on club_movement_type_config;
drop policy if exists "Admins manage movement type config in current club" on club_movement_type_config;
drop policy if exists "Treasury manage movement type config in current club" on club_movement_type_config;

create policy "Members can view movement type config"
on club_movement_type_config
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage movement type config in current club"
on club_movement_type_config
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- TREASURY CATEGORIES
-- =========================================

drop policy if exists "Members can view categories" on treasury_categories;
drop policy if exists "Admins manage categories in current club" on treasury_categories;
drop policy if exists "Treasury manage categories in current club" on treasury_categories;

create policy "Members can view categories"
on treasury_categories
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage categories in current club"
on treasury_categories
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- CLUB ACTIVITIES
-- =========================================

drop policy if exists "Members can view activities" on club_activities;
drop policy if exists "Admins manage activities in current club" on club_activities;
drop policy if exists "Treasury manage activities in current club" on club_activities;

create policy "Members can view activities"
on club_activities
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage activities in current club"
on club_activities
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- CLUB CALENDAR EVENTS
-- =========================================

drop policy if exists "Members can view calendar events" on club_calendar_events;
drop policy if exists "Admins manage calendar events in current club" on club_calendar_events;
drop policy if exists "Treasury manage calendar events in current club" on club_calendar_events;

create policy "Members can view calendar events"
on club_calendar_events
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage calendar events in current club"
on club_calendar_events
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- =========================================
-- RECEIPT FORMATS
-- =========================================

drop policy if exists "Members can view receipt formats" on receipt_formats;
drop policy if exists "Admins manage receipt formats in current club" on receipt_formats;
drop policy if exists "Treasury manage receipt formats in current club" on receipt_formats;

create policy "Members can view receipt formats"
on receipt_formats
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage receipt formats in current club"
on receipt_formats
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- =========================================
-- DAILY CASH SESSIONS
-- =========================================

drop policy if exists "Secretaria and admin can view sessions" on daily_cash_sessions;
drop policy if exists "Secretaria can manage sessions in current club" on daily_cash_sessions;

create policy "Secretaria and admin can view sessions"
on daily_cash_sessions
for select
to authenticated
using (
  club_id = current_club_id()
  and (
    (select current_user_has_role('admin'))
    or (select current_user_has_role('secretaria'))
  )
);

create policy "Secretaria can manage sessions in current club"
on daily_cash_sessions
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('secretaria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('secretaria'))
);

-- =========================================
-- DAILY CASH SESSION BALANCES
-- =========================================

drop policy if exists "Secretaria and tesoreria can view session balances" on daily_cash_session_balances;
drop policy if exists "Secretaria can insert session balances in current club" on daily_cash_session_balances;

create policy "Secretaria and tesoreria can view session balances"
on daily_cash_session_balances
for select
to authenticated
using (
  exists (
    select 1
    from daily_cash_sessions
    where daily_cash_sessions.id = daily_cash_session_balances.session_id
      and daily_cash_sessions.club_id = current_club_id()
      and (
        (select current_user_has_role('secretaria'))
        or (select current_user_has_role('tesoreria'))
      )
  )
);

create policy "Secretaria can insert session balances in current club"
on daily_cash_session_balances
for insert
to authenticated
with check (
  exists (
    select 1
    from daily_cash_sessions
    where daily_cash_sessions.id = daily_cash_session_balances.session_id
      and daily_cash_sessions.club_id = current_club_id()
      and (select current_user_has_role('secretaria'))
  )
  and exists (
    select 1
    from treasury_accounts
    where treasury_accounts.id = daily_cash_session_balances.account_id
      and treasury_accounts.club_id = current_club_id()
  )
);

-- =========================================
-- BALANCE ADJUSTMENTS
-- =========================================

drop policy if exists "Secretaria and tesoreria can view balance adjustments" on balance_adjustments;
drop policy if exists "Secretaria can insert balance adjustments in current club" on balance_adjustments;

create policy "Secretaria and tesoreria can view balance adjustments"
on balance_adjustments
for select
to authenticated
using (
  exists (
    select 1
    from daily_cash_sessions
    where daily_cash_sessions.id = balance_adjustments.session_id
      and daily_cash_sessions.club_id = current_club_id()
      and (
        (select current_user_has_role('secretaria'))
        or (select current_user_has_role('tesoreria'))
      )
  )
);

create policy "Secretaria can insert balance adjustments in current club"
on balance_adjustments
for insert
to authenticated
with check (
  exists (
    select 1
    from daily_cash_sessions
    where daily_cash_sessions.id = balance_adjustments.session_id
      and daily_cash_sessions.club_id = current_club_id()
      and (select current_user_has_role('secretaria'))
  )
  and exists (
    select 1
    from treasury_accounts
    where treasury_accounts.id = balance_adjustments.account_id
      and treasury_accounts.club_id = current_club_id()
  )
);

-- =========================================
-- TREASURY MOVEMENTS
-- =========================================

drop policy if exists "Members can view movements" on treasury_movements;
drop policy if exists "Secretaria can insert movements in current club" on treasury_movements;
drop policy if exists "Tesoreria can update movements in current club" on treasury_movements;
drop policy if exists "Secretaria and tesoreria can update movements in current club" on treasury_movements;
drop policy if exists "Admin full access movements in current club" on treasury_movements;

create policy "Members can view movements"
on treasury_movements
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Secretaria or tesoreria can insert movements in current club"
on treasury_movements
for insert
to authenticated
with check (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (
      (select current_user_has_role('tesoreria'))
      and origin_source = 'transfer'
      and origin_role = 'tesoreria'
    )
  )
);

create policy "Secretaria and tesoreria can update movements in current club"
on treasury_movements
for update
to authenticated
using (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (select current_user_has_role('tesoreria'))
  )
)
with check (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (select current_user_has_role('tesoreria'))
  )
);

create policy "Admin full access movements in current club"
on treasury_movements
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('admin'))
);

-- =========================================
-- ACCOUNT TRANSFERS
-- =========================================

drop policy if exists "Members can view account transfers" on account_transfers;
drop policy if exists "Secretaria can insert account transfers in current club" on account_transfers;

create policy "Members can view account transfers"
on account_transfers
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Secretaria or tesoreria can insert account transfers in current club"
on account_transfers
for insert
to authenticated
with check (
  club_id = current_club_id()
  and (
    (select current_user_has_role('secretaria'))
    or (select current_user_has_role('tesoreria'))
  )
  and exists (
    select 1
    from treasury_accounts source_account
    where source_account.id = account_transfers.source_account_id
      and source_account.club_id = current_club_id()
  )
  and exists (
    select 1
    from treasury_accounts target_account
    where target_account.id = account_transfers.target_account_id
      and target_account.club_id = current_club_id()
  )
);

-- =========================================
-- FX OPERATIONS
-- =========================================

drop policy if exists "Members can view fx operations" on fx_operations;
drop policy if exists "Secretaria can insert fx operations in current club" on fx_operations;
drop policy if exists "Tesoreria can insert fx operations in current club" on fx_operations;

create policy "Members can view fx operations"
on fx_operations
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Tesoreria can insert fx operations in current club"
on fx_operations
for insert
to authenticated
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from treasury_accounts source_account
    where source_account.id = fx_operations.source_account_id
      and source_account.club_id = current_club_id()
  )
  and exists (
    select 1
    from treasury_accounts target_account
    where target_account.id = fx_operations.target_account_id
      and target_account.club_id = current_club_id()
  )
);

-- =========================================
-- DAILY CONSOLIDATION BATCHES
-- =========================================

drop policy if exists "Admin and tesoreria can view consolidation batches" on daily_consolidation_batches;
drop policy if exists "Tesoreria can manage consolidation batches in current club" on daily_consolidation_batches;

create policy "Admin and tesoreria can view consolidation batches"
on daily_consolidation_batches
for select
to authenticated
using (
  club_id = current_club_id()
  and (
    (select current_user_has_role('admin'))
    or (select current_user_has_role('tesoreria'))
  )
);

create policy "Tesoreria can manage consolidation batches in current club"
on daily_consolidation_batches
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- MOVEMENT INTEGRATIONS
-- =========================================

drop policy if exists "Admin and tesoreria can view movement integrations" on movement_integrations;
drop policy if exists "Tesoreria can insert movement integrations in current club" on movement_integrations;

create policy "Admin and tesoreria can view movement integrations"
on movement_integrations
for select
to authenticated
using (
  exists (
    select 1
    from treasury_movements secretaria_movement
    where secretaria_movement.id = movement_integrations.secretaria_movement_id
      and secretaria_movement.club_id = current_club_id()
      and (
        (select current_user_has_role('admin'))
        or (select current_user_has_role('tesoreria'))
      )
  )
  and exists (
    select 1
    from treasury_movements tesoreria_movement
    where tesoreria_movement.id = movement_integrations.tesoreria_movement_id
      and tesoreria_movement.club_id = current_club_id()
  )
);

create policy "Tesoreria can insert movement integrations in current club"
on movement_integrations
for insert
to authenticated
with check (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from treasury_movements secretaria_movement
    where secretaria_movement.id = movement_integrations.secretaria_movement_id
      and secretaria_movement.club_id = current_club_id()
  )
  and exists (
    select 1
    from treasury_movements tesoreria_movement
    where tesoreria_movement.id = movement_integrations.tesoreria_movement_id
      and tesoreria_movement.club_id = current_club_id()
  )
);

-- =========================================
-- MOVEMENT AUDIT LOGS
-- =========================================

drop policy if exists "Admin and tesoreria can view movement audit logs" on movement_audit_logs;
drop policy if exists "Admin and tesoreria can insert movement audit logs" on movement_audit_logs;

create policy "Admin and tesoreria can view movement audit logs"
on movement_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from treasury_movements
    where treasury_movements.id = movement_audit_logs.movement_id
      and treasury_movements.club_id = current_club_id()
      and (
        (select current_user_has_role('admin'))
        or (select current_user_has_role('tesoreria'))
      )
  )
);

create policy "Admin and tesoreria can insert movement audit logs"
on movement_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from treasury_movements
    where treasury_movements.id = movement_audit_logs.movement_id
      and treasury_movements.club_id = current_club_id()
      and (
        (select current_user_has_role('admin'))
        or (select current_user_has_role('tesoreria'))
      )
  )
);

-- =========================================
-- RPCS
-- =========================================

create or replace function get_club_members_for_current_admin(p_club_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  club_id uuid,
  full_name text,
  email text,
  avatar_url text,
  roles membership_role[],
  status membership_status,
  joined_at timestamp
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as membership_id,
    m.user_id,
    m.club_id,
    u.full_name,
    u.email,
    u.avatar_url,
    coalesce(
      array_agg(mr.role order by array_position(array['admin'::membership_role, 'secretaria'::membership_role, 'tesoreria'::membership_role], mr.role))
        filter (where mr.role is not null),
      array[]::membership_role[]
    ) as roles,
    m.status,
    m.joined_at
  from memberships m
  join users u on u.id = m.user_id
  left join membership_roles mr on mr.membership_id = m.id
  where m.club_id = p_club_id
    and exists (
      select 1
      from memberships current_membership
      join membership_roles current_role on current_role.membership_id = current_membership.id
      where current_membership.user_id = auth.uid()
        and current_membership.club_id = p_club_id
        and current_membership.status = 'activo'
        and current_role.role = 'admin'
    )
  group by m.id, u.id
  order by u.full_name nulls last, u.email;
$$;

create or replace function get_pending_club_invitations_for_current_admin(p_club_id uuid)
returns table (
  invitation_id uuid,
  club_id uuid,
  email text,
  role membership_role,
  created_at timestamp
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ci.id as invitation_id,
    ci.club_id,
    ci.email,
    ci.role,
    ci.created_at
  from club_invitations ci
  where ci.club_id = p_club_id
    and ci.status = 'pending'
    and ci.used_at is null
    and exists (
      select 1
      from memberships current_membership
      join membership_roles current_role on current_role.membership_id = current_membership.id
      where current_membership.user_id = auth.uid()
        and current_membership.club_id = p_club_id
        and current_membership.status = 'activo'
        and current_role.role = 'admin'
    )
  order by ci.created_at, ci.email;
$$;

create or replace function approve_membership_for_current_admin(
  p_membership_id uuid,
  p_role membership_role
)
returns table (
  id uuid,
  user_id uuid,
  club_id uuid,
  status membership_status,
  joined_at timestamp,
  roles membership_role[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated memberships%rowtype;
begin
  update memberships m
  set role = p_role,
      status = 'activo',
      approved_at = now(),
      approved_by_user_id = auth.uid(),
      joined_at = now(),
      updated_at = now()
  where m.id = p_membership_id
    and exists (
      select 1
      from memberships admin_membership
      join membership_roles admin_role on admin_role.membership_id = admin_membership.id
      where admin_membership.user_id = auth.uid()
        and admin_membership.club_id = m.club_id
        and admin_membership.status = 'activo'
        and admin_role.role = 'admin'
    )
  returning m.* into v_updated;

  if not found then
    return;
  end if;

  delete from membership_roles
  where membership_id = v_updated.id;

  insert into membership_roles (membership_id, role)
  values (v_updated.id, p_role);

  return query
  select
    v_updated.id,
    v_updated.user_id,
    v_updated.club_id,
    v_updated.status,
    v_updated.joined_at,
    array[p_role]::membership_role[];
end;
$$;

create or replace function update_membership_roles_for_current_admin(
  p_membership_id uuid,
  p_roles membership_role[]
)
returns table (
  id uuid,
  user_id uuid,
  club_id uuid,
  status membership_status,
  joined_at timestamp,
  roles membership_role[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated memberships%rowtype;
  v_roles membership_role[];
begin
  select coalesce(
    array_agg(role order by array_position(array['admin'::membership_role, 'secretaria'::membership_role, 'tesoreria'::membership_role], role)),
    array[]::membership_role[]
  )
  into v_roles
  from (
    select distinct unnest(p_roles) as role
  ) normalized_roles;

  if coalesce(array_length(v_roles, 1), 0) = 0 then
    return;
  end if;

  update memberships m
  set role = v_roles[1],
      updated_at = now()
  where m.id = p_membership_id
    and exists (
      select 1
      from memberships admin_membership
      join membership_roles admin_role on admin_role.membership_id = admin_membership.id
      where admin_membership.user_id = auth.uid()
        and admin_membership.club_id = m.club_id
        and admin_membership.status = 'activo'
        and admin_role.role = 'admin'
    )
  returning m.* into v_updated;

  if not found then
    return;
  end if;

  delete from membership_roles
  where membership_id = v_updated.id;

  insert into membership_roles (membership_id, role)
  select v_updated.id, role
  from unnest(v_roles) as role;

  return query
  select
    v_updated.id,
    v_updated.user_id,
    v_updated.club_id,
    v_updated.status,
    v_updated.joined_at,
    v_roles;
end;
$$;

-- =========================================
-- COST CENTERS (US-52)
-- =========================================

drop policy if exists "Members can view cost centers" on cost_centers;
drop policy if exists "Treasury manage cost centers in current club" on cost_centers;

create policy "Members can view cost centers"
on cost_centers
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage cost centers in current club"
on cost_centers
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- =========================================
-- TREASURY MOVEMENT · COST CENTER LINKS (US-53)
-- =========================================

drop policy if exists "Members can view movement cost center links" on treasury_movement_cost_centers;
drop policy if exists "Treasury manage movement cost center links" on treasury_movement_cost_centers;

create policy "Members can view movement cost center links"
on treasury_movement_cost_centers
for select
to authenticated
using (
  exists (
    select 1
    from cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and is_member_of_current_club()
);

create policy "Treasury manage movement cost center links"
on treasury_movement_cost_centers
for all
to authenticated
using (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and exists (
    select 1
    from treasury_movements m
    where m.id = treasury_movement_cost_centers.movement_id
      and m.club_id = current_club_id()
  )
)
with check (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and exists (
    select 1
    from treasury_movements m
    where m.id = treasury_movement_cost_centers.movement_id
      and m.club_id = current_club_id()
  )
);

-- =========================================
-- COST CENTER · AUDIT LOG (US-52)
-- =========================================

drop policy if exists "Members can view cost center audit log" on cost_center_audit_log;
drop policy if exists "Treasury can insert cost center audit log" on cost_center_audit_log;

create policy "Members can view cost center audit log"
on cost_center_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from cost_centers cc
    where cc.id = cost_center_audit_log.cost_center_id
      and cc.club_id = current_club_id()
  )
  and is_member_of_current_club()
);

create policy "Treasury can insert cost center audit log"
on cost_center_audit_log
for insert
to authenticated
with check (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from cost_centers cc
    where cc.id = cost_center_audit_log.cost_center_id
      and cc.club_id = current_club_id()
  )
);

create or replace function remove_membership_for_current_actor(p_membership_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with target as (
    select m.id
    from memberships m
    where m.id = p_membership_id
      and (
        m.user_id = auth.uid()
        or exists (
          select 1
          from memberships admin_membership
          join membership_roles admin_role on admin_role.membership_id = admin_membership.id
          where admin_membership.user_id = auth.uid()
            and admin_membership.club_id = m.club_id
            and admin_membership.status = 'activo'
            and admin_role.role = 'admin'
        )
      )
  ),
  deleted as (
    delete from memberships m
    using target
    where m.id = target.id
    returning true
  )
  select coalesce((select true from deleted limit 1), false);
$$;

-- =========================================
-- E04 RRHH · RLS policies (refactor 2026-04-27)
-- =========================================
-- Todas las tablas RRHH con RLS enabled + policy club-scoped usando
-- `app.current_club_id`. hr_job_runs deny-all (acceso via RPCs SECURITY
-- DEFINER).
--
-- Modelo: las RLS son **permisivas por club_id** (cualquier user activo
-- del club puede leer/escribir). La autorización fina por rol vive en
-- la capa app (guards en lib/domain/authorization.ts) y en los RPCs
-- SECURITY DEFINER que validan el rol del actor antes de mutar.
--
-- Esto permite que rol Tesorería acceda a las mirrors read-only en
-- /treasury (US-46/47/48) sin políticas RLS específicas: el guard de
-- página decide quién entra y el service usa el guard "permisivo"
-- (canViewStaffProfile / canViewHrReports). Cualquier mutación pasa
-- por una RPC SECURITY DEFINER que valida el rol via membership_roles.
--
-- Notas:
--   - `staff_members`: drop columnas deactivated_* en migración
--     20260427030000 (US-31). El colaborador no tiene estado.
--   - `payroll_settlements`: enum status renombrado en migración
--     20260427040000 (US-63 repo / US-40 Notion, confirmada→aprobada_rrhh)
--     + 4 columnas returned_* en 20260427050000 (US-70 repo / US-41 Notion).
--   - `salary_structure_versions`: tabla dropeada en migración
--     20260424000000 (refactor monto-al-contrato). Reemplazada por
--     staff_contract_revisions.

alter table public.salary_structures enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_contracts enable row level security;
alter table public.staff_contract_revisions enable row level security;
alter table public.payroll_settlements enable row level security;
alter table public.payroll_settlement_adjustments enable row level security;
alter table public.payroll_payment_batches enable row level security;
alter table public.hr_activity_log enable row level security;
alter table public.hr_job_runs enable row level security;

-- salary_structures
create policy salary_structures_club_scope on public.salary_structures
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- staff_contract_revisions (US-32/34/35) — reemplaza al legacy
-- salary_structure_versions. Política definida en la migración
-- 20260424000000 (refactor monto-al-contrato).
create policy staff_contract_revisions_club_scope on public.staff_contract_revisions
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- staff_members
create policy staff_members_club_scope on public.staff_members
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- staff_contracts
create policy staff_contracts_club_scope on public.staff_contracts
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- payroll_settlements
create policy payroll_settlements_club_scope on public.payroll_settlements
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- payroll_settlement_adjustments (scope via join con payroll_settlements)
create policy payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments
  as permissive for all to authenticated
  using (exists (
    select 1 from public.payroll_settlements ps
    where ps.id = payroll_settlement_adjustments.settlement_id
      and ps.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
  ))
  with check (exists (
    select 1 from public.payroll_settlements ps
    where ps.id = payroll_settlement_adjustments.settlement_id
      and ps.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
  ));

-- payroll_payment_batches
create policy payroll_payment_batches_club_scope on public.payroll_payment_batches
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- hr_activity_log: solo lectura (inserción via RPCs SECURITY DEFINER).
create policy hr_activity_log_club_scope on public.hr_activity_log
  as permissive for select to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- hr_job_runs: deny-all. RPCs SECURITY DEFINER bypassean RLS.
create policy hr_job_runs_no_direct_access on public.hr_job_runs
  as permissive for all to authenticated
  using (false) with check (false);
