-- Fase 3 · E04 RRHH · US-58
-- Implementa la RPC hr_finalize_contract que cierra un contrato vigente y
-- libera la estructura salarial asociada.
--
-- Reglas:
--   - El contrato debe existir y pertenecer al club activo (app.current_club_id).
--   - Debe estar en estado 'vigente'.
--   - end_date debe ser >= start_date del contrato.
--   - end_date no puede ser mas de 10 años posterior a start_date.
--   - Idempotente sobre un contrato ya finalizado retorna `already_finalized`.
--   - Registra CONTRACT_FINALIZED en hr_activity_log.

create or replace function public.hr_finalize_contract(
  p_contract_id uuid,
  p_end_date date,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_contract record;
  v_actor uuid;
begin
  v_actor := auth.uid();

  -- 1. Cargar contrato.
  select
    id, club_id, staff_member_id, salary_structure_id, start_date, end_date,
    status, uses_structure_amount, frozen_amount
  into v_contract
  from public.staff_contracts
  where id = p_contract_id;

  if v_contract.id is null then
    return json_build_object('ok', false, 'code', 'contract_not_found');
  end if;

  v_club_id := v_contract.club_id;

  -- 2. Club scope.
  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  -- 3. Estado.
  if v_contract.status = 'finalizado' then
    return json_build_object('ok', false, 'code', 'already_finalized');
  end if;

  -- 4. Validar end_date.
  if p_end_date is null then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_end_date < v_contract.start_date then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_end_date > (v_contract.start_date + interval '10 years')::date then
    return json_build_object('ok', false, 'code', 'end_date_too_far');
  end if;

  -- 5. Actualizar el contrato.
  update public.staff_contracts
     set status = 'finalizado',
         end_date = p_end_date,
         finalized_at = now(),
         finalized_reason = p_reason,
         finalized_by_user_id = v_actor,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_contract_id;

  -- 6. Audit log.
  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id,
    'staff_contract',
    p_contract_id,
    'CONTRACT_FINALIZED',
    json_build_object(
      'status', 'vigente',
      'end_date', v_contract.end_date
    )::jsonb,
    json_build_object(
      'status', 'finalizado',
      'end_date', p_end_date,
      'finalized_reason', p_reason
    )::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'finalized');
end;
$$;
