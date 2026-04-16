create or replace function public.get_daily_consolidation_batch_by_date_for_current_club(
  p_club_id uuid,
  p_consolidation_date date
)
returns table (
  id uuid,
  club_id uuid,
  consolidation_date date,
  status public.consolidation_status,
  executed_at timestamptz,
  executed_by_user_id uuid,
  error_message text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    dcb.id,
    dcb.club_id,
    dcb.consolidation_date,
    dcb.status,
    dcb.executed_at::timestamptz,
    dcb.executed_by_user_id,
    dcb.error_message
  from public.daily_consolidation_batches dcb
  where dcb.club_id = p_club_id
    and dcb.consolidation_date = p_consolidation_date;
end;
$$;

create or replace function public.create_daily_consolidation_batch_for_current_club(
  p_club_id uuid,
  p_consolidation_date date,
  p_status public.consolidation_status,
  p_executed_by_user_id uuid
)
returns table (
  id uuid,
  club_id uuid,
  consolidation_date date,
  status public.consolidation_status,
  executed_at timestamptz,
  executed_by_user_id uuid,
  error_message text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.daily_consolidation_batches%rowtype;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.daily_consolidation_batches (
    club_id,
    consolidation_date,
    status,
    executed_at,
    executed_by_user_id
  )
  values (
    p_club_id,
    p_consolidation_date,
    p_status,
    now(),
    p_executed_by_user_id
  )
  returning *
  into v_batch;

  return query
  select
    v_batch.id,
    v_batch.club_id,
    v_batch.consolidation_date,
    v_batch.status,
    v_batch.executed_at::timestamptz,
    v_batch.executed_by_user_id,
    v_batch.error_message;
end;
$$;

create or replace function public.update_daily_consolidation_batch_for_current_club(
  p_club_id uuid,
  p_batch_id uuid,
  p_status public.consolidation_status,
  p_error_message text
)
returns table (
  id uuid,
  club_id uuid,
  consolidation_date date,
  status public.consolidation_status,
  executed_at timestamptz,
  executed_by_user_id uuid,
  error_message text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  update public.daily_consolidation_batches dcb
  set
    status = p_status,
    executed_at = case
      when p_status in ('completed', 'failed') then now()
      else dcb.executed_at
    end,
    error_message = p_error_message
  where dcb.club_id = p_club_id
    and dcb.id = p_batch_id
  returning
    dcb.id,
    dcb.club_id,
    dcb.consolidation_date,
    dcb.status,
    dcb.executed_at::timestamptz,
    dcb.executed_by_user_id,
    dcb.error_message;
end;
$$;

create or replace function public.get_movement_audit_logs_by_movement_id_for_current_club(
  p_club_id uuid,
  p_movement_id uuid
)
returns table (
  id uuid,
  movement_id uuid,
  action_type text,
  payload_before jsonb,
  payload_after jsonb,
  performed_by_user_id uuid,
  performed_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    mal.id,
    mal.movement_id,
    mal.action_type,
    mal.payload_before,
    mal.payload_after,
    mal.performed_by_user_id,
    mal.performed_at::timestamptz
  from public.movement_audit_logs mal
  join public.treasury_movements tm on tm.id = mal.movement_id
  where tm.club_id = p_club_id
    and mal.movement_id = p_movement_id
  order by mal.performed_at asc, mal.id asc;
end;
$$;

create or replace function public.create_movement_audit_log_for_current_club(
  p_club_id uuid,
  p_movement_id uuid,
  p_action_type text,
  p_payload_before jsonb,
  p_payload_after jsonb,
  p_performed_by_user_id uuid
)
returns table (
  id uuid,
  movement_id uuid,
  action_type text,
  payload_before jsonb,
  payload_after jsonb,
  performed_by_user_id uuid,
  performed_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_log public.movement_audit_logs%rowtype;
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  insert into public.movement_audit_logs (
    movement_id,
    action_type,
    payload_before,
    payload_after,
    performed_by_user_id
  )
  values (
    p_movement_id,
    p_action_type,
    p_payload_before,
    p_payload_after,
    p_performed_by_user_id
  )
  returning *
  into v_log;

  return query
  select
    v_log.id,
    v_log.movement_id,
    v_log.action_type,
    v_log.payload_before,
    v_log.payload_after,
    v_log.performed_by_user_id,
    v_log.performed_at::timestamptz;
end;
$$;
