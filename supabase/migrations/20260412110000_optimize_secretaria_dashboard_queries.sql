create or replace function public.get_treasury_movements_history_by_accounts_for_current_club(
  p_club_id uuid,
  p_account_ids uuid[]
)
returns table (
  id uuid,
  display_id text,
  club_id uuid,
  daily_cash_session_id uuid,
  account_id uuid,
  movement_type public.movement_type,
  category_id uuid,
  concept text,
  currency_code text,
  amount numeric,
  activity_id uuid,
  receipt_number text,
  calendar_event_id uuid,
  transfer_group_id uuid,
  fx_operation_group_id uuid,
  consolidation_batch_id uuid,
  movement_date date,
  created_by_user_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    tm.id,
    tm.display_id,
    tm.club_id,
    tm.daily_cash_session_id,
    tm.account_id,
    tm.movement_type,
    tm.category_id,
    tm.concept,
    tm.currency_code,
    tm.amount,
    tm.activity_id,
    tm.receipt_number,
    tm.calendar_event_id,
    tm.transfer_group_id,
    tm.fx_operation_group_id,
    tm.consolidation_batch_id,
    tm.movement_date,
    tm.created_by_user_id,
    tm.status::text,
    tm.created_at::timestamptz
  from public.treasury_movements tm
  where tm.club_id = p_club_id
    and tm.account_id = any(coalesce(p_account_ids, array[]::uuid[]))
  order by tm.created_at desc, tm.id desc;
end;
$$;

create or replace function public.count_treasury_movements_by_year_for_current_club(
  p_club_id uuid,
  p_year text
)
returns table (
  total bigint
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year_start date;
  v_year_end date;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  v_year_start := make_date(p_year::integer, 1, 1);
  v_year_end := make_date((p_year::integer + 1), 1, 1);

  return query
  select count(*)::bigint as total
  from public.treasury_movements tm
  where tm.club_id = p_club_id
    and tm.movement_date >= v_year_start
    and tm.movement_date < v_year_end;
end;
$$;

create index if not exists idx_movements_club_account_created_at
on public.treasury_movements(club_id, account_id, created_at desc);

create index if not exists idx_movements_club_date_created_at
on public.treasury_movements(club_id, movement_date, created_at desc);

create index if not exists idx_movements_club_date
on public.treasury_movements(club_id, movement_date);

create index if not exists idx_movements_club_display_id
on public.treasury_movements(club_id, display_id);
