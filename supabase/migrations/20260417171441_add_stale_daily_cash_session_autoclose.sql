create or replace function public.get_last_open_daily_cash_session_before_date_for_current_club(
  p_club_id uuid,
  p_before_date date
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
    and dcs.status = 'open'
    and dcs.session_date < p_before_date
  order by dcs.session_date desc
  limit 1;
end;
$$;

create or replace function public.auto_close_stale_daily_cash_session_with_balances_for_current_club(
  p_club_id uuid,
  p_before_date date,
  p_expected_session_id uuid,
  p_closed_by_user_id uuid,
  p_balance_entries jsonb default '[]'::jsonb
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
declare
  v_session public.daily_cash_sessions%rowtype;
  v_closed_session public.daily_cash_sessions%rowtype;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  select *
  into v_session
  from public.daily_cash_sessions
  where daily_cash_sessions.club_id = p_club_id
    and daily_cash_sessions.status = 'open'
    and daily_cash_sessions.session_date < p_before_date
  order by daily_cash_sessions.session_date desc
  limit 1
  for update;

  if not found then
    return;
  end if;

  if p_expected_session_id is not null and v_session.id <> p_expected_session_id then
    return;
  end if;

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
    v_session.id,
    entry.account_id,
    entry.currency_code,
    entry.balance_moment,
    entry.expected_balance,
    entry.declared_balance,
    entry.difference_amount
  from jsonb_to_recordset(coalesce(p_balance_entries, '[]'::jsonb)) as entry(
    account_id uuid,
    currency_code text,
    balance_moment public.balance_moment,
    expected_balance numeric,
    declared_balance numeric,
    difference_amount numeric
  );

  update public.daily_cash_sessions
  set
    status = 'closed',
    closed_at = now(),
    closed_by_user_id = p_closed_by_user_id
  where daily_cash_sessions.id = v_session.id
    and daily_cash_sessions.status = 'open'
  returning * into v_closed_session;

  if not found then
    return;
  end if;

  return query
  select
    v_closed_session.id,
    v_closed_session.club_id,
    v_closed_session.session_date,
    v_closed_session.status,
    v_closed_session.opened_at,
    v_closed_session.closed_at,
    v_closed_session.opened_by_user_id,
    v_closed_session.closed_by_user_id;
end;
$$;
