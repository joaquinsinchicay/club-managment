drop function if exists public.create_treasury_movement_for_current_club(
  uuid,
  uuid,
  text,
  uuid,
  public.movement_type,
  uuid,
  text,
  text,
  numeric,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  date,
  uuid,
  public.movement_status
);

create function public.create_treasury_movement_for_current_club(
  p_club_id uuid,
  p_daily_cash_session_id uuid,
  p_display_id text,
  p_origin_role public.movement_origin_role,
  p_origin_source public.movement_origin_source,
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
    origin_role,
    origin_source,
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
    p_origin_role,
    p_origin_source,
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
