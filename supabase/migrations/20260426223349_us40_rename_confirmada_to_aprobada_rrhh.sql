-- US-40 (ex US-63) · Rename estado "confirmada" → "aprobada_rrhh"
--
-- E04 RRHH (Notion) renombró el estado intermedio entre "generada" y
-- "pagada". El nuevo nombre es "aprobada_rrhh" porque RRHH aprueba la
-- liquidación; Tesorería luego la paga.
--
-- Cambios:
--   A. Rename enum value 'confirmada' → 'aprobada_rrhh' en
--      payroll_settlement_status.
--   B. Rename columnas confirmed_at / confirmed_by_user_id →
--      approved_at / approved_by_user_id en payroll_settlements.
--   C. Drop + recreate funciones renombradas:
--        hr_confirm_settlement       → hr_approve_settlement
--        hr_confirm_settlements_bulk → hr_approve_settlements_bulk
--   D. Replace hr_pay_settlement para validar contra 'aprobada_rrhh'.
--
-- Destructivo (base de desarrollo). Las RPCs viejas se reemplazan;
-- los clientes deben migrar a los nuevos nombres.

-- =========================================================================
-- A. Rename enum value
-- =========================================================================

alter type public.payroll_settlement_status
  rename value 'confirmada' to 'aprobada_rrhh';

-- =========================================================================
-- B. Rename columnas de auditoría
-- =========================================================================

alter table public.payroll_settlements
  rename column confirmed_at to approved_at;

alter table public.payroll_settlements
  rename column confirmed_by_user_id to approved_by_user_id;

-- =========================================================================
-- C. Drop funciones legacy
-- =========================================================================

drop function if exists public.hr_confirm_settlement(uuid, boolean);
drop function if exists public.hr_confirm_settlements_bulk(uuid[], boolean);

-- =========================================================================
-- C.1 hr_approve_settlement (US-40, ex US-63)
-- =========================================================================

create or replace function public.hr_approve_settlement(
  p_settlement_id uuid,
  p_approve_zero boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_settlement record;
  v_actor uuid;
begin
  v_actor := auth.uid();

  select s.id, s.club_id, s.status, s.total_amount, s.hours_worked, s.classes_worked,
         s.requires_hours_input, sc.salary_structure_id, ss.remuneration_type
  into v_settlement
  from public.payroll_settlements s
  join public.staff_contracts sc on sc.id = s.contract_id
  join public.salary_structures ss on ss.id = sc.salary_structure_id
  where s.id = p_settlement_id;

  if v_settlement.id is null then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;

  v_club_id := v_settlement.club_id;
  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_settlement.status = 'aprobada_rrhh' then
    return json_build_object('ok', false, 'code', 'already_approved');
  end if;
  if v_settlement.status <> 'generada' then
    return json_build_object('ok', false, 'code', 'invalid_status');
  end if;

  if v_settlement.remuneration_type in ('por_hora', 'por_clase') then
    if coalesce(v_settlement.hours_worked, 0) <= 0
       and coalesce(v_settlement.classes_worked, 0) <= 0 then
      return json_build_object('ok', false, 'code', 'hours_required');
    end if;
  end if;

  if v_settlement.total_amount < 0 then
    return json_build_object('ok', false, 'code', 'total_negative');
  end if;
  if v_settlement.total_amount = 0 and not p_approve_zero then
    return json_build_object('ok', false, 'code', 'zero_amount_requires_approval');
  end if;

  update public.payroll_settlements
     set status = 'aprobada_rrhh',
         approved_at = now(),
         approved_by_user_id = v_actor,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_settlement', p_settlement_id, 'SETTLEMENT_APPROVED',
    json_build_object('status', v_settlement.status)::jsonb,
    json_build_object('status', 'aprobada_rrhh', 'total_amount', v_settlement.total_amount)::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'approved');
end;
$$;

grant execute on function public.hr_approve_settlement(uuid, boolean) to authenticated;

-- =========================================================================
-- C.2 hr_approve_settlements_bulk (US-40, ex US-63)
-- =========================================================================

create or replace function public.hr_approve_settlements_bulk(
  p_ids uuid[],
  p_approve_zero boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_result json;
  v_ok boolean;
  v_code text;
  v_approved int := 0;
  v_skipped int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return json_build_object(
      'ok', false, 'code', 'settlement_not_found',
      'approved_count', 0, 'skipped_count', 0, 'errors', '[]'::jsonb
    );
  end if;

  foreach v_id in array p_ids loop
    v_result := public.hr_approve_settlement(v_id, p_approve_zero);
    v_ok := (v_result->>'ok')::boolean;
    v_code := v_result->>'code';
    if v_ok then
      v_approved := v_approved + 1;
    else
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_object('id', v_id, 'code', v_code);
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'code', case when v_skipped > 0 then 'partial' else 'approved_bulk' end,
    'approved_count', v_approved,
    'skipped_count', v_skipped,
    'errors', v_errors
  );
end;
$$;

grant execute on function public.hr_approve_settlements_bulk(uuid[], boolean) to authenticated;

-- =========================================================================
-- D. Replace hr_pay_settlement para validar contra 'aprobada_rrhh'
--    (mantiene firma y nombre — solo cambia el literal de status check
--    y los inserts en hr_activity_log).
-- =========================================================================

create or replace function public.hr_pay_settlement(
  p_settlement_id uuid,
  p_account_id uuid,
  p_payment_date date,
  p_receipt_number text default null,
  p_notes text default null,
  p_display_id text default null,
  p_batch_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement record;
  v_club_id uuid;
  v_current_club uuid;
  v_currency_code text;
  v_session_id uuid;
  v_movement_id uuid;
  v_movement_display_id text;
  v_actor uuid;
  v_description text;
  v_staff_member_id uuid;
  v_staff_full_name text;
  v_period_label text;
begin
  v_actor := auth.uid();

  -- 1. Cargar liquidación + datos relacionados.
  select s.id, s.club_id, s.contract_id, s.status, s.total_amount,
         s.period_year, s.period_month,
         sc.staff_member_id,
         (sm.first_name || ' ' || sm.last_name) as staff_full_name
  into v_settlement
  from public.payroll_settlements s
  join public.staff_contracts sc on sc.id = s.contract_id
  join public.staff_members sm on sm.id = sc.staff_member_id
  where s.id = p_settlement_id;

  if v_settlement.id is null then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;

  v_club_id := v_settlement.club_id;
  v_staff_member_id := v_settlement.staff_member_id;
  v_staff_full_name := v_settlement.staff_full_name;

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
  if v_settlement.status = 'pagada' then
    return json_build_object('ok', false, 'code', 'already_paid');
  end if;
  if v_settlement.status <> 'aprobada_rrhh' then
    return json_build_object('ok', false, 'code', 'invalid_status');
  end if;

  if v_settlement.total_amount <= 0 then
    return json_build_object('ok', false, 'code', 'invalid_total_amount');
  end if;

  -- 4. Validar cuenta + moneda del club.
  select currency_code into v_currency_code from public.clubs where id = v_club_id;
  if v_currency_code is null then
    return json_build_object('ok', false, 'code', 'club_not_found');
  end if;

  perform 1
  from public.treasury_accounts ta
  where ta.id = p_account_id
    and ta.club_id = v_club_id
    and ta.currency_code = v_currency_code;
  if not found then
    return json_build_object('ok', false, 'code', 'account_invalid');
  end if;

  -- 5. Sesión activa (opcional).
  select id into v_session_id
  from public.treasury_sessions
  where club_id = v_club_id
    and operator_user_id = v_actor
    and status = 'open'
  order by opened_at desc
  limit 1;

  -- 6. Crear movimiento de egreso.
  v_period_label := lpad(v_settlement.period_month::text, 2, '0') || '/' || v_settlement.period_year::text;
  v_description := 'Sueldo · ' || v_staff_full_name || ' · ' || v_period_label;

  insert into public.treasury_movements (
    club_id, account_id, movement_type, amount, currency_code,
    description, category, payment_date,
    treasury_session_id, payroll_settlement_id, staff_member_id,
    receipt_number, notes,
    origin_role, status,
    display_id,
    created_by_user_id
  ) values (
    v_club_id, p_account_id, 'egreso', v_settlement.total_amount, v_currency_code,
    v_description, 'Sueldos', p_payment_date,
    v_session_id, p_settlement_id, v_staff_member_id,
    p_receipt_number, p_notes,
    'tesoreria', 'active',
    coalesce(p_display_id, gen_random_uuid()::text),
    v_actor
  ) returning id, display_id into v_movement_id, v_movement_display_id;

  -- 7. Actualizar liquidación.
  update public.payroll_settlements
     set status = 'pagada',
         paid_at = now(),
         paid_movement_id = v_movement_id,
         paid_by_user_id = v_actor,
         payment_batch_id = p_batch_id,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_settlement', p_settlement_id, 'SETTLEMENT_PAID',
    json_build_object('status', v_settlement.status)::jsonb,
    json_build_object(
      'status', 'pagada',
      'movement_id', v_movement_id,
      'account_id', p_account_id,
      'payment_date', p_payment_date,
      'batch_id', p_batch_id
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'paid',
    'movement_id', v_movement_id,
    'movement_display_id', v_movement_display_id
  );
end;
$$;

grant execute on function public.hr_pay_settlement(uuid, uuid, date, text, text, text, uuid) to authenticated;
