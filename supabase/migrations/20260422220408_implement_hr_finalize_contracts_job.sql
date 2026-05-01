-- Fase 6 · E04 RRHH · US-59
-- Reemplaza el stub de hr_finalize_contracts_due_today_all_clubs con la
-- logica real del job diario. El schedule pg_cron ya quedó registrado en
-- la migration de Fase 1 (20260422131530_add_hr_module_schema.sql) con el
-- cron expression `5 3 * * *`.
--
-- Logica:
--   1. INSERT de apertura en hr_job_runs con status='running'.
--   2. Iterar contratos con status='vigente' y end_date = current_date
--      de todos los clubes (el job corre sin app.current_club_id).
--   3. Por cada contrato:
--      - UPDATE status='finalizado', finalized_at=now(),
--        finalized_reason='auto_finalized_by_end_date',
--        finalized_by_user_id=null (origen sistema).
--      - INSERT en hr_activity_log evento CONTRACT_FINALIZED_AUTO.
--   4. Actualizar hr_job_runs con totales finales y status final.
--   5. Idempotente: si corre dos veces el mismo día, los contratos ya
--      finalizados no aparecen en el filtro `status='vigente'` y el job
--      finaliza con contracts_processed = 0.

create or replace function public.hr_finalize_contracts_due_today_all_clubs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_contract record;
  v_processed int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_today date;
begin
  -- Argentina timezone como convención por defecto del producto.
  v_today := (timezone('America/Argentina/Buenos_Aires', now()))::date;

  -- 1. Abrir run.
  insert into public.hr_job_runs (
    job_name, status, contracts_processed, contracts_failed
  ) values (
    'hr_finalize_contracts_due_today', 'running', 0, 0
  ) returning id into v_run_id;

  -- 2. Iterar contratos candidatos.
  for v_contract in
    select id, club_id, staff_member_id, salary_structure_id, end_date
    from public.staff_contracts
    where status = 'vigente'
      and end_date = v_today
  loop
    begin
      update public.staff_contracts
         set status = 'finalizado',
             finalized_at = now(),
             finalized_reason = 'auto_finalized_by_end_date',
             finalized_by_user_id = null,
             updated_at = now()
       where id = v_contract.id
         and status = 'vigente';

      insert into public.hr_activity_log (
        club_id, entity_type, entity_id, action,
        payload_before, payload_after, performed_by_user_id
      ) values (
        v_contract.club_id,
        'staff_contract',
        v_contract.id,
        'CONTRACT_FINALIZED_AUTO',
        json_build_object(
          'status', 'vigente',
          'end_date', v_contract.end_date
        )::jsonb,
        json_build_object(
          'status', 'finalizado',
          'finalized_reason', 'auto_finalized_by_end_date'
        )::jsonb,
        null
      );

      v_processed := v_processed + 1;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'contract_id', v_contract.id,
        'club_id', v_contract.club_id,
        'error', sqlerrm
      );
    end;
  end loop;

  -- 3. Cerrar run.
  update public.hr_job_runs
     set status = case
           when v_failed = 0 then 'success'::public.hr_job_run_status
           when v_processed = 0 then 'failed'::public.hr_job_run_status
           else 'partial'::public.hr_job_run_status
         end,
         contracts_processed = v_processed,
         contracts_failed = v_failed,
         error_payload = case when v_errors = '[]'::jsonb then null else v_errors end,
         finished_at = now()
   where id = v_run_id;
end;
$$;
