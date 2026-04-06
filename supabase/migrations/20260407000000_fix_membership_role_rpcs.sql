create or replace function public.approve_membership_for_current_admin(
  p_membership_id uuid,
  p_role public.membership_role
)
returns table (
  id uuid,
  user_id uuid,
  club_id uuid,
  status public.membership_status,
  joined_at timestamp,
  roles public.membership_role[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated public.memberships%rowtype;
begin
  update public.memberships m
  set role = p_role,
      status = 'activo',
      approved_at = now(),
      approved_by_user_id = auth.uid(),
      joined_at = now(),
      updated_at = now()
  where m.id = p_membership_id
    and exists (
      select 1
      from public.memberships admin_membership
      join public.membership_roles admin_role on admin_role.membership_id = admin_membership.id
      where admin_membership.user_id = auth.uid()
        and admin_membership.club_id = m.club_id
        and admin_membership.status = 'activo'
        and admin_role.role = 'admin'
    )
  returning m.* into v_updated;

  if not found then
    return;
  end if;

  delete from public.membership_roles
  where membership_id = v_updated.id;

  insert into public.membership_roles (membership_id, role)
  values (v_updated.id, p_role);

  return query
  select
    v_updated.id,
    v_updated.user_id,
    v_updated.club_id,
    v_updated.status,
    v_updated.joined_at,
    array[p_role]::public.membership_role[];
end;
$$;

create or replace function public.update_membership_roles_for_current_admin(
  p_membership_id uuid,
  p_roles public.membership_role[]
)
returns table (
  id uuid,
  user_id uuid,
  club_id uuid,
  status public.membership_status,
  joined_at timestamp,
  roles public.membership_role[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated public.memberships%rowtype;
  v_roles public.membership_role[];
begin
  select coalesce(
    array_agg(role order by array_position(array['admin'::public.membership_role, 'secretaria'::public.membership_role, 'tesoreria'::public.membership_role], role)),
    array[]::public.membership_role[]
  )
  into v_roles
  from (
    select distinct unnest(p_roles) as role
  ) normalized_roles;

  if coalesce(array_length(v_roles, 1), 0) = 0 then
    return;
  end if;

  update public.memberships m
  set role = v_roles[1],
      updated_at = now()
  where m.id = p_membership_id
    and exists (
      select 1
      from public.memberships admin_membership
      join public.membership_roles admin_role on admin_role.membership_id = admin_membership.id
      where admin_membership.user_id = auth.uid()
        and admin_membership.club_id = m.club_id
        and admin_membership.status = 'activo'
        and admin_role.role = 'admin'
    )
  returning m.* into v_updated;

  if not found then
    return;
  end if;

  delete from public.membership_roles
  where membership_id = v_updated.id;

  insert into public.membership_roles (membership_id, role)
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
