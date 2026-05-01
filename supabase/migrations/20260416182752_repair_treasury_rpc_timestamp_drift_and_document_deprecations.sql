create or replace function public.update_treasury_movement_for_current_club(
  p_club_id uuid,
  p_movement_id uuid,
  p_account_id uuid,
  p_movement_date date,
  p_movement_type public.movement_type,
  p_category_id uuid,
  p_concept text,
  p_currency_code text,
  p_amount numeric,
  p_activity_id uuid,
  p_receipt_number text,
  p_calendar_event_id uuid,
  p_status public.movement_status,
  p_consolidation_batch_id uuid
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
  update public.treasury_movements tm
  set
    account_id = p_account_id,
    movement_date = coalesce(p_movement_date, tm.movement_date),
    movement_type = p_movement_type,
    category_id = p_category_id,
    concept = p_concept,
    currency_code = p_currency_code,
    amount = p_amount,
    activity_id = p_activity_id,
    receipt_number = p_receipt_number,
    calendar_event_id = p_calendar_event_id,
    status = coalesce(p_status, tm.status),
    consolidation_batch_id = coalesce(p_consolidation_batch_id, tm.consolidation_batch_id)
  where tm.club_id = p_club_id
    and tm.id = p_movement_id
  returning
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
    tm.created_at::timestamptz;
end;
$$;

create or replace function public.update_treasury_movement_for_current_club(
  p_club_id uuid,
  p_movement_id uuid,
  p_account_id uuid,
  p_movement_type public.movement_type,
  p_category_id uuid,
  p_concept text,
  p_currency_code text,
  p_amount numeric,
  p_activity_id uuid,
  p_receipt_number text,
  p_calendar_event_id uuid,
  p_status public.movement_status,
  p_consolidation_batch_id uuid
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
  update public.treasury_movements tm
  set
    account_id = p_account_id,
    movement_type = p_movement_type,
    category_id = p_category_id,
    concept = p_concept,
    currency_code = p_currency_code,
    amount = p_amount,
    activity_id = p_activity_id,
    receipt_number = p_receipt_number,
    calendar_event_id = p_calendar_event_id,
    status = coalesce(p_status, tm.status),
    consolidation_batch_id = coalesce(p_consolidation_batch_id, tm.consolidation_batch_id)
  where tm.club_id = p_club_id
    and tm.id = p_movement_id
  returning
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
    tm.created_at::timestamptz;
end;
$$;

comment on function public.update_treasury_movement_for_current_club(
  uuid,
  uuid,
  uuid,
  date,
  public.movement_type,
  uuid,
  text,
  text,
  numeric,
  uuid,
  text,
  uuid,
  public.movement_status,
  uuid
) is 'ACTIVE RPC. Supports editing movement_date during consolidation and casts treasury_movements.created_at to timestamptz in the return payload to avoid 42804 drift errors.';

comment on function public.update_treasury_movement_for_current_club(
  uuid,
  uuid,
  uuid,
  public.movement_type,
  uuid,
  text,
  text,
  numeric,
  uuid,
  text,
  uuid,
  public.movement_status,
  uuid
) is 'DEPRECATED. Legacy compatibility overload kept temporarily for environments that still retry without p_movement_date. No active repo consumer should call it directly after 2026-04-16.';
