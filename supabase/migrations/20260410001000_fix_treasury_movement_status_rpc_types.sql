create or replace function public.create_treasury_movement_for_current_club(
  p_club_id uuid,
  p_daily_cash_session_id uuid,
  p_display_id text,
  p_account_id uuid,
  p_movement_type public.movement_type,
  p_category_id uuid,
  p_concept text,
  p_currency_code text,
  p_amount numeric,
  p_activity_id uuid,
  p_receipt_number text,
  p_calendar_event_id uuid,
  p_transfer_group_id uuid,
  p_fx_operation_group_id uuid,
  p_consolidation_batch_id uuid,
  p_movement_date date,
  p_created_by_user_id uuid,
  p_status public.movement_status
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
    activity_id,
    receipt_number,
    calendar_event_id,
    transfer_group_id,
    fx_operation_group_id,
    consolidation_batch_id,
    movement_date,
    created_by_user_id,
    status
  )
  values (
    p_club_id,
    p_daily_cash_session_id,
    p_display_id,
    p_account_id,
    p_movement_type,
    p_category_id,
    p_concept,
    p_currency_code,
    p_amount,
    p_activity_id,
    p_receipt_number,
    p_calendar_event_id,
    p_transfer_group_id,
    p_fx_operation_group_id,
    p_consolidation_batch_id,
    p_movement_date,
    p_created_by_user_id,
    p_status
  )
  returning
    treasury_movements.id,
    treasury_movements.display_id,
    treasury_movements.club_id,
    treasury_movements.daily_cash_session_id,
    treasury_movements.account_id,
    treasury_movements.movement_type,
    treasury_movements.category_id,
    treasury_movements.concept,
    treasury_movements.currency_code,
    treasury_movements.amount,
    treasury_movements.activity_id,
    treasury_movements.receipt_number,
    treasury_movements.calendar_event_id,
    treasury_movements.transfer_group_id,
    treasury_movements.fx_operation_group_id,
    treasury_movements.consolidation_batch_id,
    treasury_movements.movement_date,
    treasury_movements.created_by_user_id,
    treasury_movements.status::text,
    treasury_movements.created_at::timestamptz;
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
