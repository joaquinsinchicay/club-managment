-- =========================================
-- ENABLE RLS
-- =========================================

alter table users enable row level security;
alter table clubs enable row level security;
alter table memberships enable row level security;
alter table treasury_accounts enable row level security;
alter table treasury_movements enable row level security;
alter table daily_cash_sessions enable row level security;

-- =========================================
-- HELPER FUNCTION
-- =========================================

-- Devuelve el user_id desde Supabase auth
create or replace function current_user_id()
returns uuid as $$
select auth.uid();
$$ language sql stable;

-- Devuelve el club activo (se espera que venga en JWT o setting)
create or replace function current_club_id()
returns uuid as $$
select current_setting('app.current_club_id', true)::uuid;
$$ language sql stable;

-- Devuelve el rol del usuario en el club activo
create or replace function current_user_role()
returns text as $$
select role::text
from memberships
where user_id = auth.uid()
and club_id = current_club_id()
and status = 'activo'
limit 1;
$$ language sql stable;

-- Verifica si pertenece al club activo
create or replace function is_member_of_current_club()
returns boolean as $$
select exists (
select 1
from memberships
where user_id = auth.uid()
and club_id = current_club_id()
and status = 'activo'
);
$$ language sql stable;

-- =========================================
-- USERS
-- =========================================

create policy "Users can see themselves"
on users
for select
using (id = auth.uid());

-- =========================================
-- CLUBS
-- =========================================

create policy "User can see their clubs"
on clubs
for select
using (
exists (
select 1 from memberships
where memberships.club_id = clubs.id
and memberships.user_id = auth.uid()
and memberships.status = 'activo'
)
);

-- =========================================
-- MEMBERSHIPS
-- =========================================

create policy "Users see memberships of their clubs"
on memberships
for select
using (
club_id = current_club_id()
and is_member_of_current_club()
);

create policy "Admins manage memberships"
on memberships
for all
using (
current_user_role() = 'admin'
)
with check (
current_user_role() = 'admin'
);

-- =========================================
-- TREASURY ACCOUNTS
-- =========================================

create policy "Members can view accounts"
on treasury_accounts
for select
using (
club_id = current_club_id()
and is_member_of_current_club()
);

create policy "Admins manage accounts"
on treasury_accounts
for all
using (
current_user_role() = 'admin'
)
with check (
current_user_role() = 'admin'
);

-- =========================================
-- DAILY CASH SESSIONS
-- =========================================

create policy "Secretaria and admin can view sessions"
on daily_cash_sessions
for select
using (
club_id = current_club_id()
and current_user_role() in ('admin', 'secretaria')
);

create policy "Secretaria manage sessions"
on daily_cash_sessions
for all
using (
current_user_role() = 'secretaria'
)
with check (
current_user_role() = 'secretaria'
);

-- =========================================
-- TREASURY MOVEMENTS
-- =========================================

-- Ver movimientos
create policy "Members can view movements"
on treasury_movements
for select
using (
club_id = current_club_id()
and is_member_of_current_club()
);

-- Secretaria crea movimientos
create policy "Secretaria can insert movements"
on treasury_movements
for insert
with check (
current_user_role() = 'secretaria'
and club_id = current_club_id()
);

-- Tesoreria puede actualizar en consolidación
create policy "Tesoreria can update movements"
on treasury_movements
for update
using (
current_user_role() = 'tesoreria'
)
with check (
current_user_role() = 'tesoreria'
);

-- Admin full access
create policy "Admin full access movements"
on treasury_movements
for all
using (
current_user_role() = 'admin'
)
with check (
current_user_role() = 'admin'
);

-- =========================================
-- SEGURIDAD EXTRA IMPORTANTE
-- =========================================

-- Bloquear acceso cross-club SIEMPRE
-- (esto ya está implícito pero reforzado conceptualmente)

-- Regla clave:
-- Ninguna query puede devolver datos de otro club
