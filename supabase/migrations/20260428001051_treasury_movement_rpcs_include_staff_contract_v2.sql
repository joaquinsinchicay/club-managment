drop function if exists public.get_treasury_movements_history_by_account_for_current_club(uuid, uuid);
drop function if exists public.get_treasury_movements_history_by_accounts_for_current_club(uuid, uuid[]);

create or replace function public.get_treasury_movements_history_by_account_for_current_club(
  p_club_id uuid,
  p_account_id uuid
)
returns table(
  id uuid, display_id text, club_id uuid, daily_cash_session_id uuid, account_id uuid,
  movement_type movement_type, category_id uuid, concept text, currency_code text, amount numeric,
  activity_id uuid, receipt_number text, calendar_event_id uuid, transfer_group_id uuid,
  fx_operation_group_id uuid, consolidation_batch_id uuid, movement_date date,
  created_by_user_id uuid, status text, created_at timestamp with time zone, staff_contract_id uuid
)
language plpgsql
set search_path to 'public'
as $function$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);
  return query
  select tm.id, tm.display_id, tm.club_id, tm.daily_cash_session_id, tm.account_id, tm.movement_type,
         tm.category_id, tm.concept, tm.currency_code, tm.amount, tm.activity_id, tm.receipt_number,
         tm.calendar_event_id, tm.transfer_group_id, tm.fx_operation_group_id, tm.consolidation_batch_id,
         tm.movement_date, tm.created_by_user_id, tm.status::text, tm.created_at::timestamptz,
         tm.staff_contract_id
  from public.treasury_movements tm
  where tm.club_id = p_club_id and tm.account_id = p_account_id
  order by tm.created_at desc, tm.id desc;
end;
$function$;

create or replace function public.get_treasury_movements_history_by_accounts_for_current_club(
  p_club_id uuid,
  p_account_ids uuid[]
)
returns table(
  id uuid, display_id text, club_id uuid, daily_cash_session_id uuid, account_id uuid,
  movement_type movement_type, category_id uuid, concept text, currency_code text, amount numeric,
  activity_id uuid, receipt_number text, calendar_event_id uuid, transfer_group_id uuid,
  fx_operation_group_id uuid, consolidation_batch_id uuid, movement_date date,
  created_by_user_id uuid, status text, created_at timestamp with time zone, staff_contract_id uuid
)
language plpgsql
set search_path to 'public'
as $function$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);
  return query
  select tm.id, tm.display_id, tm.club_id, tm.daily_cash_session_id, tm.account_id, tm.movement_type,
         tm.category_id, tm.concept, tm.currency_code, tm.amount, tm.activity_id, tm.receipt_number,
         tm.calendar_event_id, tm.transfer_group_id, tm.fx_operation_group_id, tm.consolidation_batch_id,
         tm.movement_date, tm.created_by_user_id, tm.status::text, tm.created_at::timestamptz,
         tm.staff_contract_id
  from public.treasury_movements tm
  where tm.club_id = p_club_id and tm.account_id = any(p_account_ids)
  order by tm.created_at desc, tm.id desc;
end;
$function$;
