-- Restaura en repo las 3 RPCs SECURITY DEFINER usadas por el módulo Settings → Miembros
-- (lib/repositories/access-repository.ts:2143, 2242, 4575). Estas funciones existían en la DB
-- pero no en el repo de migrations — drift del audit 2026-05-01 (issue Crítico #1).
--
-- Definiciones extraídas via pg_get_functiondef del entorno productivo. Idempotentes:
-- CREATE OR REPLACE permite re-aplicarse sin efecto en DB ya migrada.
--
-- GRANT acordes al patrón post-2026-05-01 (REVOKE FROM PUBLIC + GRANT a authenticated y
-- service_role). Si esta migration corre antes de 20260502020000 en un entorno limpio, los
-- grants quedan ya configurados; si corre después, son idempotentes.

create or replace function public.get_club_members_for_current_admin(p_club_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  club_id uuid,
  full_name text,
  email text,
  avatar_url text,
  roles public.membership_role[],
  status public.membership_status,
  joined_at timestamp without time zone
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
      array_agg(mr.role order by array_position(array['admin'::public.membership_role, 'secretaria'::public.membership_role, 'tesoreria'::public.membership_role], mr.role))
        filter (where mr.role is not null),
      array[]::public.membership_role[]
    ) as roles,
    m.status,
    m.joined_at
  from public.memberships m
  join public.users u on u.id = m.user_id
  left join public.membership_roles mr on mr.membership_id = m.id
  where m.club_id = p_club_id
    and exists (
      select 1
      from public.memberships cm
      join public.membership_roles cr on cr.membership_id = cm.id
      where cm.user_id = auth.uid()
        and cm.club_id = p_club_id
        and cm.status = 'activo'
        and cr.role = 'admin'
    )
  group by m.id, u.id
  order by u.full_name nulls last, u.email;
$$;

create or replace function public.get_pending_club_invitations_for_current_admin(p_club_id uuid)
returns table (
  invitation_id uuid,
  club_id uuid,
  email text,
  role public.membership_role,
  created_at timestamp without time zone
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
  from public.club_invitations ci
  where ci.club_id = p_club_id
    and ci.status = 'pending'
    and ci.used_at is null
    and exists (
      select 1
      from public.memberships cm
      join public.membership_roles cr on cr.membership_id = cm.id
      where cm.user_id = auth.uid()
        and cm.club_id = p_club_id
        and cm.status = 'activo'
        and cr.role = 'admin'
    )
  order by ci.created_at, ci.email;
$$;

create or replace function public.remove_membership_for_current_actor(p_membership_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with target as (
    select m.id
    from public.memberships m
    where m.id = p_membership_id
      and (
        m.user_id = auth.uid()
        or exists (
          select 1
          from public.memberships admin_m
          join public.membership_roles admin_r on admin_r.membership_id = admin_m.id
          where admin_m.user_id = auth.uid()
            and admin_m.club_id = m.club_id
            and admin_m.status = 'activo'
            and admin_r.role = 'admin'
        )
      )
  ),
  deleted as (
    delete from public.memberships m
    using target
    where m.id = target.id
    returning true
  )
  select coalesce((select true from deleted limit 1), false);
$$;

-- Permisos: anon no, authenticated y service_role sí (alineado con 20260502020000).
revoke execute on function public.get_club_members_for_current_admin(uuid) from public;
revoke execute on function public.get_club_members_for_current_admin(uuid) from anon;
grant execute on function public.get_club_members_for_current_admin(uuid) to authenticated;
grant execute on function public.get_club_members_for_current_admin(uuid) to service_role;

revoke execute on function public.get_pending_club_invitations_for_current_admin(uuid) from public;
revoke execute on function public.get_pending_club_invitations_for_current_admin(uuid) from anon;
grant execute on function public.get_pending_club_invitations_for_current_admin(uuid) to authenticated;
grant execute on function public.get_pending_club_invitations_for_current_admin(uuid) to service_role;

revoke execute on function public.remove_membership_for_current_actor(uuid) from public;
revoke execute on function public.remove_membership_for_current_actor(uuid) from anon;
grant execute on function public.remove_membership_for_current_actor(uuid) to authenticated;
grant execute on function public.remove_membership_for_current_actor(uuid) to service_role;
