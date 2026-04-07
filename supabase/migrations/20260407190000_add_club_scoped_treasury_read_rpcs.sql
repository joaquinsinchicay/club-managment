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
  status text,
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
    ca.status,
    ca.emoji
  from public.club_activities ca
  where ca.club_id = p_club_id
  order by ca.name;
end;
$$;

create or replace function public.get_receipt_formats_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  validation_type public.receipt_validation_type,
  pattern text,
  min_numeric_value numeric,
  example text,
  status text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    rf.id,
    rf.club_id,
    rf.name,
    rf.validation_type,
    rf.pattern,
    rf.min_numeric_value,
    rf.example,
    rf.status
  from public.receipt_formats rf
  where rf.club_id = p_club_id
  order by rf.name;
end;
$$;

create or replace function public.get_treasury_currencies_for_current_club(p_club_id uuid)
returns table (
  club_id uuid,
  currency_code text,
  is_primary boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    ctc.club_id,
    ctc.currency_code,
    ctc.is_primary
  from public.club_treasury_currencies ctc
  where ctc.club_id = p_club_id
  order by ctc.currency_code;
end;
$$;

create or replace function public.get_movement_type_config_for_current_club(p_club_id uuid)
returns table (
  club_id uuid,
  movement_type public.movement_type,
  is_enabled boolean
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    cmtc.club_id,
    cmtc.movement_type,
    cmtc.is_enabled
  from public.club_movement_type_config cmtc
  where cmtc.club_id = p_club_id
  order by cmtc.movement_type;
end;
$$;
