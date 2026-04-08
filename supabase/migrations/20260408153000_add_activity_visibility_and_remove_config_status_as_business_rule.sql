alter table public.club_activities
add column if not exists visible_for_secretaria boolean not null default true,
add column if not exists visible_for_tesoreria boolean not null default false;

update public.club_activities
set
  visible_for_secretaria = coalesce(visible_for_secretaria, true),
  visible_for_tesoreria = coalesce(visible_for_tesoreria, false)
where visible_for_secretaria is null or visible_for_tesoreria is null;

create or replace function public.get_treasury_accounts_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  account_type public.account_type,
  account_scope public.account_scope,
  status text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean,
  emoji text,
  currencies text[]
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    ta.id,
    ta.club_id,
    ta.name,
    ta.account_type,
    ta.account_scope,
    ta.status,
    ta.visible_for_secretaria,
    ta.visible_for_tesoreria,
    ta.emoji,
    coalesce(
      array_agg(tac.currency_code order by tac.currency_code)
      filter (where tac.currency_code is not null),
      array[]::text[]
    ) as currencies
  from public.treasury_accounts ta
  left join public.treasury_account_currencies tac on tac.account_id = ta.id
  where ta.club_id = p_club_id
  group by
    ta.id,
    ta.club_id,
    ta.name,
    ta.account_type,
    ta.account_scope,
    ta.status,
    ta.visible_for_secretaria,
    ta.visible_for_tesoreria,
    ta.emoji
  order by ta.name;
end;
$$;

create or replace function public.get_treasury_categories_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  status text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean,
  emoji text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    tc.id,
    tc.club_id,
    tc.name,
    tc.status,
    tc.visible_for_secretaria,
    tc.visible_for_tesoreria,
    tc.emoji
  from public.treasury_categories tc
  where tc.club_id = p_club_id
  order by tc.name;
end;
$$;

create or replace function public.get_club_activities_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean,
  emoji text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    ca.id,
    ca.club_id,
    ca.name,
    ca.visible_for_secretaria,
    ca.visible_for_tesoreria,
    ca.emoji
  from public.club_activities ca
  where ca.club_id = p_club_id
  order by ca.name;
end;
$$;
