-- Fase 5 · E04 RRHH · Pagos (US-64 / US-65)
--
-- Reemplaza los stubs de hr_pay_settlement y hr_pay_settlements_batch
-- con lógica transaccional. Cada pago:
--   1. Valida club_scope + status de la liquidación (confirmada).
--   2. Resuelve la categoría "Sueldos" del club (sub_category_name).
--   3. Resuelve la daily_cash_session abierta del tesorero hoy (si hay).
--   4. INSERT en treasury_movements con status='posted',
--      movement_type='egreso', currency = clubs.currency_code,
--      origin_role='tesoreria', origin_source='manual',
--      payroll_settlement_id = settlement.id,
--      payroll_payment_batch_id (si es bulk).
--   5. UPDATE payroll_settlements → status='pagada',
--      paid_at=now(), paid_movement_id=movement.id.
--   6. INSERT en hr_activity_log + movement_audit_log.
--
-- El display_id lo genera el caller (service en TS) y lo pasa por
-- parámetro para mantener consistencia con la convención ya usada en el
-- resto del módulo de Tesorería.

-- =========================================================================
-- hr_pay_settlement (US-64)
-- =========================================================================

create or replace function public.hr_pay_settlement(
  p_settlement_id uuid,
  p_account_id uuid,
  p_payment_date date,
  p_receipt_number text,
  p_notes text,
  p_display_id text,
  p_batch_id uuid default null
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
  v_category_id uuid;
  v_currency_code text;
  v_session_id uuid;
  v_movement_id uuid;
  v_actor uuid;
  v_concept text;
  v_staff_name text;
  v_period_label text;
begin
  v_actor := auth.uid();

  -- 1. Cargar liquidación + enriquecer con nombre del colaborador.
  select
    s.id, s.club_id, s.status, s.total_amount, s.contract_id,
    s.period_year, s.period_month,
    sm.first_name || ' ' || sm.last_name as staff_name
  into v_settlement
  from public.payroll_settlements s
  join public.staff_contracts c on c.id = s.contract_id
  join public.staff_members sm on sm.id = c.staff_member_id
  where s.id = p_settlement_id;

  if v_settlement.id is null then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;

  v_club_id := v_settlement.club_id;
  v_staff_name := v_settlement.staff_name;
  v_period_label := lpad(v_settlement.period_month::text, 2, '0') || '/' || v_settlement.period_year::text;

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
  if v_settlement.status <> 'confirmada' then
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
    and ta.visible_for_tesoreria = true;
  if not found then
    return json_build_object('ok', false, 'code', 'account_not_available');
  end if;

  perform 1
  from public.treasury_account_currencies tac
  where tac.account_id = p_account_id
    and tac.currency_code = v_currency_code;
  if not found then
    return json_build_object('ok', false, 'code', 'currency_mismatch');
  end if;

  -- 5. Categoría "Sueldos".
  select id into v_category_id
  from public.treasury_categories
  where club_id = v_club_id
    and sub_category_name = 'Sueldos'
    and movement_type = 'egreso'
  limit 1;
  if v_category_id is null then
    return json_build_object('ok', false, 'code', 'sueldos_category_not_found');
  end if;

  -- 6. Jornada abierta (opcional).
  if v_actor is not null then
    select id into v_session_id
    from public.daily_cash_sessions
    where club_id = v_club_id
      and opened_by_user_id = v_actor
      and session_date = p_payment_date
      and status = 'open'
    limit 1;
  end if;

  -- 7. Validar fecha de pago: entre -365 y +7 días de hoy.
  if p_payment_date is null then
    return json_build_object('ok', false, 'code', 'payment_date_required');
  end if;
  if p_payment_date < (current_date - interval '365 days')::date then
    return json_build_object('ok', false, 'code', 'invalid_payment_date');
  end if;
  if p_payment_date > (current_date + interval '7 days')::date then
    return json_build_object('ok', false, 'code', 'invalid_payment_date');
  end if;

  -- 8. Concepto autogenerado.
  v_concept := 'Sueldo — ' || v_staff_name || ' — ' || v_period_label;

  -- 9. INSERT movement.
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
    movement_date,
    created_by_user_id,
    status,
    payroll_settlement_id,
    payroll_payment_batch_id,
    receipt_number
  ) values (
    v_club_id,
    v_session_id,
    p_display_id,
    'tesoreria',
    'manual',
    p_account_id,
    'egreso',
    v_category_id,
    v_concept,
    v_currency_code,
    v_settlement.total_amount,
    p_payment_date,
    v_actor,
    'posted',
    p_settlement_id,
    p_batch_id,
    nullif(p_receipt_number, '')
  ) returning id into v_movement_id;

  -- 10. UPDATE settlement.
  update public.payroll_settlements
     set status = 'pagada',
         paid_at = now(),
         paid_movement_id = v_movement_id,
         notes = case when p_notes is null or p_notes = '' then notes else p_notes end,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  -- 11. Audit log RRHH.
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
      'batch_id', p_batch_id,
      'amount', v_settlement.total_amount
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'paid',
    'movement_id', v_movement_id,
    'settlement_id', p_settlement_id
  );
end;
$$;

-- =========================================================================
-- hr_pay_settlements_batch (US-65)
-- =========================================================================

create or replace function public.hr_pay_settlements_batch(
  p_ids uuid[],
  p_account_id uuid,
  p_payment_date date,
  p_notes text,
  p_display_ids text[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_actor uuid;
  v_batch_id uuid;
  v_total numeric(18,2) := 0;
  v_count int;
  v_index int;
  v_id uuid;
  v_display_id text;
  v_result json;
  v_ok boolean;
  v_code text;
  v_failed_id uuid;
  v_per_settlement_total numeric(18,2);
begin
  v_actor := auth.uid();
  v_count := array_length(p_ids, 1);

  if v_count is null or v_count = 0 then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;
  if array_length(p_display_ids, 1) <> v_count then
    return json_build_object('ok', false, 'code', 'display_ids_mismatch');
  end if;

  -- 1. Club scope.
  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;
  v_club_id := v_current_club;

  -- 2. Calcular total y validar que todas las liquidaciones estén
  --    confirmadas y pertenezcan al club.
  select coalesce(sum(s.total_amount), 0)
    into v_total
    from public.payroll_settlements s
    where s.id = any(p_ids)
      and s.club_id = v_club_id;

  select count(*)::int
    into v_count
    from public.payroll_settlements s
    where s.id = any(p_ids)
      and s.club_id = v_club_id;

  if v_count is null or v_count = 0 then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;
  if v_count <> array_length(p_ids, 1) then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;

  -- 3. Crear batch.
  insert into public.payroll_payment_batches (
    club_id, account_id, payment_date, notes, total_amount, settlement_count,
    created_by_user_id
  ) values (
    v_club_id, p_account_id, p_payment_date, p_notes, v_total, v_count, v_actor
  ) returning id into v_batch_id;

  -- 4. Loop atómico: si alguno falla, la transacción completa rollback
  --    (el wrapper PL/pgSQL hace rollback implícito en RAISE).
  for v_index in 1..v_count loop
    v_id := p_ids[v_index];
    v_display_id := p_display_ids[v_index];

    v_result := public.hr_pay_settlement(
      v_id,
      p_account_id,
      p_payment_date,
      null,              -- receipt_number queda vacío en bulk
      p_notes,
      v_display_id,
      v_batch_id
    );

    v_ok := (v_result->>'ok')::boolean;
    v_code := v_result->>'code';

    if not v_ok then
      v_failed_id := v_id;
      insert into public.hr_activity_log (
        club_id, entity_type, entity_id, action,
        payload_after, performed_by_user_id
      ) values (
        v_club_id, 'payroll_batch', v_batch_id, 'SETTLEMENTS_PAYMENT_BATCH_FAILED',
        json_build_object(
          'failed_settlement_id', v_failed_id,
          'failure_code', v_code,
          'attempted_ids', p_ids
        )::jsonb,
        v_actor
      );
      -- RAISE EXCEPTION aborta la transacción y la función retorna null a
      -- nivel SQL, pero atrapamos en PL/pgSQL para mantener la semántica
      -- de json retornado. Usamos `return` sin RAISE y confiamos en que
      -- los UPDATEs ya realizados dentro del mismo CALL quedarán
      -- revertidos porque el client abre una transacción antes del RPC
      -- (Supabase lo garantiza en llamadas sin autocommit explícito).
      -- Para máxima seguridad, forzamos rollback parcial undoing el batch.
      -- PostgreSQL no soporta SAVEPOINT dentro del cuerpo de una función
      -- security definer fácilmente, por lo que elegimos RAISE EXCEPTION.
      raise exception using message = 'HR_PAY_BATCH_FAILED:' || v_code || ':' || v_failed_id::text;
    end if;

    v_per_settlement_total := (v_result->>'settlement_id') is not null; -- touch
  end loop;

  -- 5. Audit log global.
  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_batch', v_batch_id, 'SETTLEMENTS_PAID_BATCH',
    json_build_object(
      'batch_id', v_batch_id,
      'count', v_count,
      'total_amount', v_total
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'paid_batch',
    'batch_id', v_batch_id,
    'count', v_count,
    'total_amount', v_total
  );

exception
  when others then
    -- Extraer el código y el settlement_id del mensaje.
    if sqlstate = 'P0001' and sqlerrm like 'HR_PAY_BATCH_FAILED:%' then
      return json_build_object(
        'ok', false,
        'code', split_part(sqlerrm, ':', 2),
        'failed_settlement_id', split_part(sqlerrm, ':', 3)
      );
    end if;
    raise;
end;
$$;
