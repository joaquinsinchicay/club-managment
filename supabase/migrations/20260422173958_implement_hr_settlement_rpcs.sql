-- Fase 4 · E04 RRHH · Liquidaciones (US-61 / US-63 / US-66)
--
-- Reemplaza los stubs de:
--   - hr_generate_monthly_settlements(year, month)
--   - hr_confirm_settlement(settlement_id, confirm_zero)
--   - hr_confirm_settlements_bulk(ids[], confirm_zero)
--   - hr_annul_settlement(settlement_id, reason)
--
-- Todas respetan club_scope via app.current_club_id y registran en
-- hr_activity_log. Monto base se resuelve segun reglas del contrato:
--   - uses_structure_amount = true  → vigente de salary_structure_versions
--   - uses_structure_amount = false → frozen_amount del contrato
--   - remuneration_type in (por_hora, por_clase) → base = 0,
--     requires_hours_input = true.

-- =========================================================================
-- hr_generate_monthly_settlements (US-61)
-- =========================================================================

create or replace function public.hr_generate_monthly_settlements(
  p_year int,
  p_month int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_actor uuid;
  v_generated int := 0;
  v_skipped int := 0;
  v_errors int := 0;
  v_period_start date;
  v_period_end date;
  v_contract record;
  v_existing_id uuid;
  v_base_amount numeric(18,2);
  v_requires_hours boolean;
begin
  v_actor := auth.uid();

  begin
    v_club_id := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_club_id := null;
  end;

  if v_club_id is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_year is null or p_month is null or p_month < 1 or p_month > 12 then
    return json_build_object('ok', false, 'code', 'invalid_period');
  end if;

  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + interval '1 month - 1 day')::date;

  for v_contract in
    select c.id, c.staff_member_id, c.salary_structure_id, c.uses_structure_amount,
           c.frozen_amount, c.start_date, c.end_date,
           ss.remuneration_type
    from public.staff_contracts c
    join public.salary_structures ss on ss.id = c.salary_structure_id
    where c.club_id = v_club_id
      and c.status = 'vigente'
      and c.start_date <= v_period_end
      and (c.end_date is null or c.end_date >= v_period_start)
  loop
    select id into v_existing_id
    from public.payroll_settlements
    where contract_id = v_contract.id
      and period_year = p_year
      and period_month = p_month
      and status <> 'anulada'
    limit 1;

    if v_existing_id is not null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_requires_hours := (v_contract.remuneration_type in ('por_hora', 'por_clase'));

    if v_requires_hours then
      v_base_amount := 0;
    elsif v_contract.uses_structure_amount then
      select amount into v_base_amount
      from public.salary_structure_versions
      where salary_structure_id = v_contract.salary_structure_id
        and end_date is null
      limit 1;
      if v_base_amount is null then
        v_errors := v_errors + 1;
        continue;
      end if;
    else
      v_base_amount := v_contract.frozen_amount;
      if v_base_amount is null then
        v_errors := v_errors + 1;
        continue;
      end if;
    end if;

    insert into public.payroll_settlements (
      club_id, contract_id, period_year, period_month,
      base_amount, adjustments_total, total_amount,
      hours_worked, classes_worked, requires_hours_input,
      status, created_by_user_id, updated_by_user_id
    ) values (
      v_club_id, v_contract.id, p_year, p_month,
      v_base_amount, 0, v_base_amount,
      0, 0, v_requires_hours,
      'generada', v_actor, v_actor
    );

    v_generated := v_generated + 1;
  end loop;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_batch', gen_random_uuid(), 'SETTLEMENTS_GENERATED',
    json_build_object(
      'period_year', p_year,
      'period_month', p_month,
      'generated_count', v_generated,
      'skipped_count', v_skipped,
      'error_count', v_errors
    )::jsonb,
    v_actor
  );

  if v_generated = 0 and v_skipped = 0 and v_errors = 0 then
    return json_build_object(
      'ok', false,
      'code', 'no_active_contracts',
      'generated_count', 0, 'skipped_count', 0, 'error_count', 0
    );
  end if;

  return json_build_object(
    'ok', true,
    'code', case when v_errors > 0 then 'partial' else 'generated' end,
    'generated_count', v_generated,
    'skipped_count', v_skipped,
    'error_count', v_errors
  );
end;
$$;

-- =========================================================================
-- hr_confirm_settlement (US-63)
-- =========================================================================

create or replace function public.hr_confirm_settlement(
  p_settlement_id uuid,
  p_confirm_zero boolean default false
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

  if v_settlement.status = 'confirmada' then
    return json_build_object('ok', false, 'code', 'already_confirmed');
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
  if v_settlement.total_amount = 0 and not p_confirm_zero then
    return json_build_object('ok', false, 'code', 'zero_amount_requires_confirm');
  end if;

  update public.payroll_settlements
     set status = 'confirmada',
         confirmed_at = now(),
         confirmed_by_user_id = v_actor,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_settlement', p_settlement_id, 'SETTLEMENT_CONFIRMED',
    json_build_object('status', v_settlement.status)::jsonb,
    json_build_object('status', 'confirmada', 'total_amount', v_settlement.total_amount)::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'confirmed');
end;
$$;

-- =========================================================================
-- hr_confirm_settlements_bulk (US-63)
-- =========================================================================

create or replace function public.hr_confirm_settlements_bulk(
  p_ids uuid[],
  p_confirm_zero boolean default false
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
  v_confirmed int := 0;
  v_skipped int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return json_build_object(
      'ok', false, 'code', 'settlement_not_found',
      'confirmed_count', 0, 'skipped_count', 0, 'errors', '[]'::jsonb
    );
  end if;

  foreach v_id in array p_ids loop
    v_result := public.hr_confirm_settlement(v_id, p_confirm_zero);
    v_ok := (v_result->>'ok')::boolean;
    v_code := v_result->>'code';
    if v_ok then
      v_confirmed := v_confirmed + 1;
    else
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_object('id', v_id, 'code', v_code);
    end if;
  end loop;

  return json_build_object(
    'ok', true,
    'code', case when v_skipped > 0 then 'partial' else 'confirmed_bulk' end,
    'confirmed_count', v_confirmed,
    'skipped_count', v_skipped,
    'errors', v_errors
  );
end;
$$;

-- =========================================================================
-- hr_annul_settlement (US-66)
-- =========================================================================

create or replace function public.hr_annul_settlement(
  p_settlement_id uuid,
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
  v_settlement record;
  v_movement_status text;
  v_actor uuid;
begin
  v_actor := auth.uid();

  select id, club_id, status, paid_movement_id
  into v_settlement
  from public.payroll_settlements
  where id = p_settlement_id;

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

  if v_settlement.status = 'anulada' then
    return json_build_object('ok', false, 'code', 'already_annulled');
  end if;

  if v_settlement.status = 'pagada' then
    -- Requires the linked movement to be cancelled first.
    if v_settlement.paid_movement_id is null then
      return json_build_object('ok', false, 'code', 'movement_still_active');
    end if;
    select status into v_movement_status
    from public.treasury_movements
    where id = v_settlement.paid_movement_id;
    if v_movement_status is null or v_movement_status <> 'cancelled' then
      return json_build_object('ok', false, 'code', 'movement_still_active');
    end if;
  end if;

  update public.payroll_settlements
     set status = 'anulada',
         annulled_at = now(),
         annulled_by_user_id = v_actor,
         annulled_reason = p_reason,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_settlement', p_settlement_id, 'SETTLEMENT_ANNULLED',
    json_build_object('status', v_settlement.status)::jsonb,
    json_build_object('status', 'anulada', 'reason', p_reason)::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'annulled');
end;
$$;
