update public.daily_cash_sessions
set opened_at = coalesce(opened_at, closed_at, now())
where opened_at is null;

alter table public.daily_cash_sessions
alter column opened_at set default now();

alter table public.daily_cash_sessions
alter column opened_at set not null;

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
    opened_at,
    opened_by_user_id
  )
  values (
    p_club_id,
    p_session_date,
    'open',
    now(),
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

create or replace function public.open_daily_cash_session_with_balances_for_current_club(
  p_club_id uuid,
  p_session_date date,
  p_opened_by_user_id uuid,
  p_balance_entries jsonb,
  p_adjustment_entries jsonb default '[]'::jsonb
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
  v_adjustment record;
  v_movement_id uuid;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.daily_cash_sessions (
    club_id,
    session_date,
    status,
    opened_at,
    opened_by_user_id
  )
  values (
    p_club_id,
    p_session_date,
    'open',
    now(),
    p_opened_by_user_id
  )
  returning * into v_session;

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

  for v_adjustment in
    select *
    from jsonb_to_recordset(coalesce(p_adjustment_entries, '[]'::jsonb)) as entry(
      account_id uuid,
      movement_type public.movement_type,
      category_id uuid,
      concept text,
      currency_code text,
      amount numeric,
      movement_date date,
      created_by_user_id uuid,
      display_id text,
      status public.movement_status,
      difference_amount numeric,
      adjustment_moment public.balance_moment
    )
  loop
    insert into public.treasury_movements (
      club_id,
      daily_cash_session_id,
      display_id,
      account_id,
      movement_type,
      category_id,
      concept,
      currency_code,
      amount,
      movement_date,
      created_by_user_id,
      status,
      origin_role,
      origin_source
    )
    values (
      p_club_id,
      v_session.id,
      v_adjustment.display_id,
      v_adjustment.account_id,
      v_adjustment.movement_type,
      v_adjustment.category_id,
      v_adjustment.concept,
      v_adjustment.currency_code,
      v_adjustment.amount,
      v_adjustment.movement_date,
      v_adjustment.created_by_user_id,
      v_adjustment.status,
      'system',
      'adjustment'
    )
    returning treasury_movements.id into v_movement_id;

    insert into public.balance_adjustments (
      session_id,
      movement_id,
      account_id,
      difference_amount,
      adjustment_moment
    )
    values (
      v_session.id,
      v_movement_id,
      v_adjustment.account_id,
      v_adjustment.difference_amount,
      v_adjustment.adjustment_moment
    );
  end loop;

  return query
  select
    v_session.id,
    v_session.club_id,
    v_session.session_date,
    v_session.status,
    v_session.opened_at,
    v_session.closed_at,
    v_session.opened_by_user_id,
    v_session.closed_by_user_id;
end;
$$;
