create or replace function public.create_fx_operation_for_current_club(
  p_club_id uuid,
  p_source_account_id uuid,
  p_target_account_id uuid,
  p_source_amount numeric,
  p_target_amount numeric
)
returns table (
  id uuid,
  club_id uuid,
  source_account_id uuid,
  target_account_id uuid,
  source_amount numeric,
  target_amount numeric,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_operation public.fx_operations%rowtype;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.fx_operations (
    club_id,
    source_account_id,
    target_account_id,
    source_amount,
    target_amount
  )
  values (
    p_club_id,
    p_source_account_id,
    p_target_account_id,
    p_source_amount,
    p_target_amount
  )
  returning *
  into v_operation;

  return query
  select
    v_operation.id,
    v_operation.club_id,
    v_operation.source_account_id,
    v_operation.target_account_id,
    v_operation.source_amount,
    v_operation.target_amount,
    v_operation.created_at::timestamptz;
end;
$$;
