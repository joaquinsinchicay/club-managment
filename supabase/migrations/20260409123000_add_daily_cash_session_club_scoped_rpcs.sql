create or replace function public.get_daily_cash_session_for_current_club(
  p_club_id uuid,
  p_session_date date
)
returns table (
  id uuid,
  club_id uuid,
  session_date date,
  status public.session_status,
  opened_at timestamp,
  closed_at timestamp,
  opened_by_user_id uuid,
  closed_by_user_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    dcs.id,
    dcs.club_id,
    dcs.session_date,
    dcs.status,
    dcs.opened_at,
    dcs.closed_at,
    dcs.opened_by_user_id,
    dcs.closed_by_user_id
  from public.daily_cash_sessions dcs
  where dcs.club_id = p_club_id
    and dcs.session_date = p_session_date;
end;
$$;

create or replace function public.create_daily_cash_session_for_current_club(
  p_club_id uuid,
  p_session_date date,
  p_opened_by_user_id uuid
)
returns table (
  id uuid,
  club_id uuid,
  session_date date,
  status public.session_status,
  opened_at timestamp,
  closed_at timestamp,
  opened_by_user_id uuid,
  closed_by_user_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  insert into public.daily_cash_sessions (
    club_id,
    session_date,
    status,
    opened_by_user_id
  )
  values (
    p_club_id,
    p_session_date,
    'open',
    p_opened_by_user_id
  )
  returning
    daily_cash_sessions.id,
    daily_cash_sessions.club_id,
    daily_cash_sessions.session_date,
    daily_cash_sessions.status,
    daily_cash_sessions.opened_at,
    daily_cash_sessions.closed_at,
    daily_cash_sessions.opened_by_user_id,
    daily_cash_sessions.closed_by_user_id;
end;
$$;

create or replace function public.close_daily_cash_session_for_current_club(
  p_club_id uuid,
  p_session_id uuid,
  p_closed_by_user_id uuid
)
returns table (
  id uuid,
  club_id uuid,
  session_date date,
  status public.session_status,
  opened_at timestamp,
  closed_at timestamp,
  opened_by_user_id uuid,
  closed_by_user_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  update public.daily_cash_sessions
  set
    status = 'closed',
    closed_at = now(),
    closed_by_user_id = p_closed_by_user_id
  where daily_cash_sessions.id = p_session_id
    and daily_cash_sessions.club_id = p_club_id
  returning
    daily_cash_sessions.id,
    daily_cash_sessions.club_id,
    daily_cash_sessions.session_date,
    daily_cash_sessions.status,
    daily_cash_sessions.opened_at,
    daily_cash_sessions.closed_at,
    daily_cash_sessions.opened_by_user_id,
    daily_cash_sessions.closed_by_user_id;
end;
$$;

create or replace function public.record_daily_cash_session_balances_for_current_club(
  p_club_id uuid,
  p_entries jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.daily_cash_session_balances (
    session_id,
    account_id,
    currency_code,
    balance_moment,
    expected_balance,
    declared_balance,
    difference_amount
  )
  select
    entry.session_id,
    entry.account_id,
    entry.currency_code,
    entry.balance_moment,
    entry.expected_balance,
    entry.declared_balance,
    entry.difference_amount
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as entry(
    session_id uuid,
    account_id uuid,
    currency_code text,
    balance_moment public.balance_moment,
    expected_balance numeric,
    declared_balance numeric,
    difference_amount numeric
  );
end;
$$;

create or replace function public.record_balance_adjustment_for_current_club(
  p_club_id uuid,
  p_session_id uuid,
  p_movement_id uuid,
  p_account_id uuid,
  p_difference_amount numeric,
  p_adjustment_moment public.balance_moment
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.balance_adjustments (
    session_id,
    movement_id,
    account_id,
    difference_amount,
    adjustment_moment
  )
  values (
    p_session_id,
    p_movement_id,
    p_account_id,
    p_difference_amount,
    p_adjustment_moment
  );
end;
$$;
