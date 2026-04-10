create or replace function public.create_account_transfer_for_current_club(
  p_club_id uuid,
  p_daily_cash_session_id uuid,
  p_source_account_id uuid,
  p_target_account_id uuid,
  p_currency_code text,
  p_amount numeric,
  p_concept text,
  p_source_movement_display_id text,
  p_target_movement_display_id text,
  p_movement_date date,
  p_created_by_user_id uuid
)
returns table (
  transfer_id uuid,
  club_id uuid,
  source_account_id uuid,
  target_account_id uuid,
  currency_code text,
  amount numeric,
  concept text,
  created_at timestamptz,
  source_movement_display_id text,
  target_movement_display_id text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_transfer public.account_transfers%rowtype;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.account_transfers (
    club_id,
    source_account_id,
    target_account_id,
    currency_code,
    amount,
    concept
  )
  values (
    p_club_id,
    p_source_account_id,
    p_target_account_id,
    p_currency_code,
    p_amount,
    p_concept
  )
  returning *
  into v_transfer;

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
  values
    (
      p_club_id,
      p_daily_cash_session_id,
      p_source_movement_display_id,
      'secretaria',
      'transfer',
      p_source_account_id,
      'egreso',
      null,
      p_concept,
      p_currency_code,
      p_amount,
      null,
      null,
      null,
      v_transfer.id,
      null,
      null,
      p_movement_date,
      p_created_by_user_id,
      'pending_consolidation'
    ),
    (
      p_club_id,
      p_daily_cash_session_id,
      p_target_movement_display_id,
      'secretaria',
      'transfer',
      p_target_account_id,
      'ingreso',
      null,
      p_concept,
      p_currency_code,
      p_amount,
      null,
      null,
      null,
      v_transfer.id,
      null,
      null,
      p_movement_date,
      p_created_by_user_id,
      'pending_consolidation'
    );

  return query
  select
    v_transfer.id,
    v_transfer.club_id,
    v_transfer.source_account_id,
    v_transfer.target_account_id,
    v_transfer.currency_code,
    v_transfer.amount,
    v_transfer.concept,
    v_transfer.created_at::timestamptz,
    p_source_movement_display_id,
    p_target_movement_display_id;
end;
$$;
