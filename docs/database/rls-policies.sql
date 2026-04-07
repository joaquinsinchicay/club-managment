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
alter table club_treasury_currencies enable row level security;
alter table club_movement_type_config enable row level security;
alter table treasury_movements enable row level security;
alter table daily_cash_sessions enable row level security;

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

create policy "Members can view accounts"
on treasury_accounts
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage accounts in current club"
on treasury_accounts
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
-- CLUB TREASURY CURRENCIES
-- =========================================

drop policy if exists "Members can view treasury currencies" on club_treasury_currencies;
drop policy if exists "Admins manage treasury currencies in current club" on club_treasury_currencies;

create policy "Members can view treasury currencies"
on club_treasury_currencies
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage treasury currencies in current club"
on club_treasury_currencies
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
-- MOVEMENT TYPE CONFIG
-- =========================================

drop policy if exists "Members can view movement type config" on club_movement_type_config;
drop policy if exists "Admins manage movement type config in current club" on club_movement_type_config;

create policy "Members can view movement type config"
on club_movement_type_config
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage movement type config in current club"
on club_movement_type_config
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
-- TREASURY CATEGORIES
-- =========================================

drop policy if exists "Members can view categories" on treasury_categories;
drop policy if exists "Admins manage categories in current club" on treasury_categories;

create policy "Members can view categories"
on treasury_categories
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage categories in current club"
on treasury_categories
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
-- CLUB ACTIVITIES
-- =========================================

drop policy if exists "Members can view activities" on club_activities;
drop policy if exists "Admins manage activities in current club" on club_activities;

create policy "Members can view activities"
on club_activities
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Admins manage activities in current club"
on club_activities
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
-- TREASURY MOVEMENTS
-- =========================================

drop policy if exists "Members can view movements" on treasury_movements;
drop policy if exists "Secretaria can insert movements in current club" on treasury_movements;
drop policy if exists "Tesoreria can update movements in current club" on treasury_movements;
drop policy if exists "Admin full access movements in current club" on treasury_movements;

create policy "Members can view movements"
on treasury_movements
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Secretaria can insert movements in current club"
on treasury_movements
for insert
to authenticated
with check (
  club_id = current_club_id()
  and (select current_user_has_role('secretaria'))
);

create policy "Tesoreria can update movements in current club"
on treasury_movements
for update
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
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
