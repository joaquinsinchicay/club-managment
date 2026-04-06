-- =========================================
-- ENABLE RLS
-- =========================================

alter table users enable row level security;
alter table clubs enable row level security;
alter table memberships enable row level security;
alter table club_invitations enable row level security;
alter table user_club_preferences enable row level security;
alter table treasury_accounts enable row level security;
alter table treasury_movements enable row level security;
alter table daily_cash_sessions enable row level security;

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

-- Devuelve el user_id desde Supabase Auth.
create or replace function current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- Devuelve el email autenticado desde el JWT de Supabase Auth.
create or replace function current_user_email()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'email';
$$;

-- Devuelve el club activo seteado por backend en la request.
create or replace function current_club_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_club_id', true), '')::uuid;
$$;

-- Devuelve el rol activo del usuario autenticado en el club activo.
-- SECURITY DEFINER evita recursión de policies sobre memberships al evaluar helpers de autorización.
create or replace function current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from memberships
  where user_id = auth.uid()
    and club_id = current_club_id()
    and status = 'activo'
  limit 1;
$$;

-- Verifica si el usuario autenticado tiene membership activa en el club activo.
-- SECURITY DEFINER evita recursión de policies sobre memberships al evaluar helpers de autorización.
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
using (id = current_user_id());

create policy "Admins can see users of current club"
on users
for select
using (
  current_user_role() = 'admin'
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
with check (
  id = current_user_id()
  and email = current_user_email()
);

create policy "Users can update themselves"
on users
for update
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
using (
  exists (
    select 1
    from memberships
    where memberships.club_id = clubs.id
      and memberships.user_id = current_user_id()
      and memberships.status = 'activo'
  )
);

-- =========================================
-- MEMBERSHIPS
-- =========================================

drop policy if exists "Users see memberships of their clubs" on memberships;
drop policy if exists "Users can see own memberships" on memberships;
drop policy if exists "Admins manage memberships" on memberships;
drop policy if exists "Admins manage memberships in current club" on memberships;

create policy "Users can see own memberships"
on memberships
for select
using (user_id = current_user_id());

create policy "Admins manage memberships in current club"
on memberships
for all
using (
  club_id = current_club_id()
  and current_user_role() = 'admin'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'admin'
);

-- =========================================
-- CLUB INVITATIONS
-- =========================================

drop policy if exists "Admins manage invitations in current club" on club_invitations;

create policy "Admins manage invitations in current club"
on club_invitations
for all
using (
  club_id = current_club_id()
  and current_user_role() = 'admin'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'admin'
);

-- =========================================
-- USER CLUB PREFERENCES
-- =========================================

drop policy if exists "Users can manage own club preferences" on user_club_preferences;

create policy "Users can manage own club preferences"
on user_club_preferences
for all
using (user_id = current_user_id())
with check (user_id = current_user_id());

-- =========================================
-- TREASURY ACCOUNTS
-- =========================================

drop policy if exists "Members can view accounts" on treasury_accounts;
drop policy if exists "Admins manage accounts" on treasury_accounts;
drop policy if exists "Admins manage accounts in current club" on treasury_accounts;

create policy "Members can view accounts"
on treasury_accounts
for select
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage accounts in current club"
on treasury_accounts
for all
using (
  club_id = current_club_id()
  and current_user_role() = 'admin'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'admin'
);

-- =========================================
-- DAILY CASH SESSIONS
-- =========================================

drop policy if exists "Secretaria and admin can view sessions" on daily_cash_sessions;
drop policy if exists "Secretaria manage sessions" on daily_cash_sessions;
drop policy if exists "Secretaria can manage sessions in current club" on daily_cash_sessions;

create policy "Secretaria and admin can view sessions"
on daily_cash_sessions
for select
using (
  club_id = current_club_id()
  and current_user_role() in ('admin', 'secretaria')
);

create policy "Secretaria can manage sessions in current club"
on daily_cash_sessions
for all
using (
  club_id = current_club_id()
  and current_user_role() = 'secretaria'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'secretaria'
);

-- =========================================
-- TREASURY MOVEMENTS
-- =========================================

drop policy if exists "Members can view movements" on treasury_movements;
drop policy if exists "Secretaria can insert movements" on treasury_movements;
drop policy if exists "Secretaria can insert movements in current club" on treasury_movements;
drop policy if exists "Tesoreria can update movements" on treasury_movements;
drop policy if exists "Tesoreria can update movements in current club" on treasury_movements;
drop policy if exists "Admin full access movements" on treasury_movements;
drop policy if exists "Admin full access movements in current club" on treasury_movements;

create policy "Members can view movements"
on treasury_movements
for select
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Secretaria can insert movements in current club"
on treasury_movements
for insert
with check (
  club_id = current_club_id()
  and current_user_role() = 'secretaria'
);

create policy "Tesoreria can update movements in current club"
on treasury_movements
for update
using (
  club_id = current_club_id()
  and current_user_role() = 'tesoreria'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'tesoreria'
);

create policy "Admin full access movements in current club"
on treasury_movements
for all
using (
  club_id = current_club_id()
  and current_user_role() = 'admin'
)
with check (
  club_id = current_club_id()
  and current_user_role() = 'admin'
);

-- =========================================
-- SEGURIDAD EXTRA IMPORTANTE
-- =========================================

-- Ninguna query multi-tenant debe confiar solo en frontend.
-- El backend debe setear app.current_club_id y RLS debe filtrar por club activo.
-- Las lecturas preselección de club solo pueden exponer recursos propios del usuario autenticado
-- (perfil propio, memberships propias y preferencias propias).
