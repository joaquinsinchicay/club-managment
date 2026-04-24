-- Fase 1 · E04 RRHH · Refactor: monto al contrato (alineado con spec Notion)
--
-- Mueve el concepto de monto desde la Estructura Salarial al Contrato, vía
-- una nueva entidad Revisión Salarial (por contrato). El maestro de
-- Estructuras queda como puro catálogo — sin monto ni versiones.
--
-- Cambios:
--   A. Drop RPC hr_update_salary_structure_amount, vista
--      salary_structure_current_amount, tabla salary_structure_versions y
--      columnas staff_contracts.uses_structure_amount / frozen_amount.
--   B. Nueva tabla staff_contract_revisions con RLS y unique parcial.
--   C. Nuevas RPCs:
--        hr_create_contract_with_initial_revision (alta atómica)
--        hr_create_salary_revision (cierra vigente + abre nueva)
--        hr_create_salary_revisions_bulk (revisión masiva transaccional)
--   D. Reemplazo de hr_generate_monthly_settlements para leer de revisiones.
--   E. Actualización de hr_finalize_contract y el job diario para cerrar la
--      revisión vigente cuando el contrato se finaliza.
--
-- Destructivo: para base de desarrollo. No hay contratos/versiones reales.

-- =========================================================================
-- A. DROPS (orden inverso de dependencias)
-- =========================================================================

drop function if exists public.hr_update_salary_structure_amount(uuid, numeric, date);
drop view if exists public.salary_structure_current_amount;
drop index if exists public.salary_structure_versions_unique_current;
drop index if exists public.salary_structure_versions_structure_start_idx;
drop table if exists public.salary_structure_versions cascade;

alter table public.staff_contracts
  drop constraint if exists staff_contracts_amount_coherent;

alter table public.staff_contracts
  drop column if exists uses_structure_amount,
  drop column if exists frozen_amount;

-- =========================================================================
-- B. Nueva entidad: staff_contract_revisions
-- =========================================================================

create type public.salary_revision_adjustment_type as enum (
  'percent',
  'fixed',
  'set'
);

create table public.staff_contract_revisions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  contract_id uuid not null references public.staff_contracts(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  effective_date date not null,
  end_date date null,
  reason text null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid null references public.users(id),
  constraint staff_contract_revisions_date_order check (
    end_date is null or end_date >= effective_date
  )
);

create unique index staff_contract_revisions_unique_current
  on public.staff_contract_revisions (contract_id)
  where end_date is null;

create index staff_contract_revisions_contract_effective_idx
  on public.staff_contract_revisions (contract_id, effective_date desc);

alter table public.staff_contract_revisions enable row level security;

drop policy if exists staff_contract_revisions_club_scope on public.staff_contract_revisions;
create policy staff_contract_revisions_club_scope on public.staff_contract_revisions
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- =========================================================================
-- C. RPCs nuevas
-- =========================================================================

-- C.1 hr_create_contract_with_initial_revision
-- Inserta el contrato + la primera revisión en una sola transacción.
-- Devuelve ok/code + contract_id + revision_id.
create or replace function public.hr_create_contract_with_initial_revision(
  p_staff_member_id uuid,
  p_salary_structure_id uuid,
  p_start_date date,
  p_end_date date,
  p_initial_amount numeric,
  p_initial_revision_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_member_club uuid;
  v_structure_club uuid;
  v_structure_status text;
  v_existing_contract uuid;
  v_contract_id uuid;
  v_revision_id uuid;
  v_actor uuid;
  v_reason text;
begin
  v_actor := auth.uid();

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  if v_current_club is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  -- Validar colaborador y estructura pertenecen al club activo.
  select club_id into v_member_club
  from public.staff_members
  where id = p_staff_member_id;
  if v_member_club is null or v_member_club <> v_current_club then
    return json_build_object('ok', false, 'code', 'staff_member_required');
  end if;

  select club_id, status into v_structure_club, v_structure_status
  from public.salary_structures
  where id = p_salary_structure_id;
  if v_structure_club is null or v_structure_club <> v_current_club then
    return json_build_object('ok', false, 'code', 'structure_required');
  end if;
  if v_structure_status <> 'activa' then
    return json_build_object('ok', false, 'code', 'salary_structure_not_active');
  end if;

  v_club_id := v_current_club;

  -- Validaciones básicas.
  if p_start_date is null then
    return json_build_object('ok', false, 'code', 'invalid_start_date');
  end if;
  if p_end_date is not null and p_end_date < p_start_date then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_initial_amount is null or p_initial_amount <= 0 then
    return json_build_object('ok', false, 'code', 'initial_amount_invalid');
  end if;

  -- Estructura no puede tener ya un contrato vigente.
  select id into v_existing_contract
  from public.staff_contracts
  where salary_structure_id = p_salary_structure_id
    and status = 'vigente'
  limit 1;
  if v_existing_contract is not null then
    return json_build_object('ok', false, 'code', 'structure_already_taken');
  end if;

  -- 1. Insert contrato.
  insert into public.staff_contracts (
    club_id, staff_member_id, salary_structure_id,
    start_date, end_date, status,
    created_by_user_id, updated_by_user_id
  ) values (
    v_club_id, p_staff_member_id, p_salary_structure_id,
    p_start_date, p_end_date, 'vigente',
    v_actor, v_actor
  ) returning id into v_contract_id;

  -- 2. Insert primera revisión.
  v_reason := coalesce(nullif(trim(p_initial_revision_reason), ''), 'Monto inicial del contrato');
  insert into public.staff_contract_revisions (
    club_id, contract_id, amount, effective_date, end_date,
    reason, created_by_user_id
  ) values (
    v_club_id, v_contract_id, p_initial_amount, p_start_date, null,
    v_reason, v_actor
  ) returning id into v_revision_id;

  -- 3. Audit.
  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'staff_contract', v_contract_id, 'CONTRACT_CREATED',
    json_build_object(
      'staff_member_id', p_staff_member_id,
      'salary_structure_id', p_salary_structure_id,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'initial_amount', p_initial_amount,
      'initial_revision_id', v_revision_id
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'created',
    'contract_id', v_contract_id,
    'revision_id', v_revision_id
  );
end;
$$;

-- C.2 hr_create_salary_revision
-- Cierra la revisión vigente del contrato y abre una nueva.
create or replace function public.hr_create_salary_revision(
  p_contract_id uuid,
  p_amount numeric,
  p_effective_date date,
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
  v_current_revision record;
  v_new_revision_id uuid;
  v_actor uuid;
begin
  v_actor := auth.uid();

  -- Cargar contrato.
  select id, club_id, status, start_date, end_date
    into v_contract
  from public.staff_contracts
  where id = p_contract_id;

  if v_contract.id is null then
    return json_build_object('ok', false, 'code', 'contract_not_found');
  end if;

  v_club_id := v_contract.club_id;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_contract.status <> 'vigente' then
    return json_build_object('ok', false, 'code', 'contract_not_active');
  end if;

  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'code', 'amount_must_be_positive');
  end if;

  if p_effective_date is null then
    return json_build_object('ok', false, 'code', 'effective_date_required');
  end if;

  if p_effective_date < v_contract.start_date then
    return json_build_object('ok', false, 'code', 'invalid_effective_date');
  end if;

  if v_contract.end_date is not null and p_effective_date > v_contract.end_date then
    return json_build_object('ok', false, 'code', 'invalid_effective_date');
  end if;

  -- Cargar revisión vigente.
  select id, amount, effective_date
    into v_current_revision
  from public.staff_contract_revisions
  where contract_id = p_contract_id
    and end_date is null
  limit 1;

  if v_current_revision.id is not null then
    if p_effective_date <= v_current_revision.effective_date then
      return json_build_object('ok', false, 'code', 'invalid_effective_date');
    end if;

    update public.staff_contract_revisions
       set end_date = p_effective_date - interval '1 day'
     where id = v_current_revision.id;
  end if;

  -- Abrir revisión nueva.
  insert into public.staff_contract_revisions (
    club_id, contract_id, amount, effective_date, end_date,
    reason, created_by_user_id
  ) values (
    v_club_id, p_contract_id, p_amount, p_effective_date, null,
    nullif(trim(p_reason), ''), v_actor
  ) returning id into v_new_revision_id;

  update public.staff_contracts
     set updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_contract_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'staff_contract', p_contract_id, 'SALARY_REVISION_CREATED',
    case
      when v_current_revision.id is null then null
      else json_build_object(
        'previous_revision_id', v_current_revision.id,
        'previous_amount', v_current_revision.amount
      )::jsonb
    end,
    json_build_object(
      'new_revision_id', v_new_revision_id,
      'new_amount', p_amount,
      'effective_date', p_effective_date,
      'reason', nullif(trim(p_reason), '')
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'revision_created',
    'revision_id', v_new_revision_id
  );
end;
$$;

-- C.3 hr_create_salary_revisions_bulk
-- Aplica un ajuste masivo sobre múltiples contratos en una sola transacción.
-- Si cualquier contrato falla, rollback completo.
create or replace function public.hr_create_salary_revisions_bulk(
  p_contract_ids uuid[],
  p_adjustment_type public.salary_revision_adjustment_type,
  p_value numeric,
  p_effective_date date,
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
  v_actor uuid;
  v_contract_id uuid;
  v_contract record;
  v_current_revision record;
  v_new_amount numeric(18,2);
  v_new_revision_id uuid;
  v_created int := 0;
  v_created_ids jsonb := '[]'::jsonb;
begin
  v_actor := auth.uid();

  if p_contract_ids is null or array_length(p_contract_ids, 1) is null then
    return json_build_object('ok', false, 'code', 'no_contracts_selected');
  end if;

  if p_value is null then
    return json_build_object('ok', false, 'code', 'value_required');
  end if;
  if p_adjustment_type = 'set' and p_value <= 0 then
    return json_build_object('ok', false, 'code', 'value_must_be_positive');
  end if;
  if p_effective_date is null then
    return json_build_object('ok', false, 'code', 'effective_date_required');
  end if;
  if nullif(trim(p_reason), '') is null then
    return json_build_object('ok', false, 'code', 'reason_required');
  end if;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;
  v_club_id := v_current_club;

  foreach v_contract_id in array p_contract_ids loop
    -- Validar contrato.
    select id, club_id, status, start_date, end_date
      into v_contract
    from public.staff_contracts
    where id = v_contract_id;

    if v_contract.id is null or v_contract.club_id <> v_club_id then
      raise exception using message = 'contract_not_found:' || v_contract_id;
    end if;
    if v_contract.status <> 'vigente' then
      raise exception using message = 'contract_not_active:' || v_contract_id;
    end if;
    if p_effective_date < v_contract.start_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;
    if v_contract.end_date is not null and p_effective_date > v_contract.end_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;

    -- Revisión vigente.
    select id, amount, effective_date
      into v_current_revision
    from public.staff_contract_revisions
    where contract_id = v_contract_id
      and end_date is null
    limit 1;

    if v_current_revision.id is null then
      raise exception using message = 'current_revision_not_found:' || v_contract_id;
    end if;
    if p_effective_date <= v_current_revision.effective_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;

    -- Calcular monto nuevo.
    v_new_amount := case p_adjustment_type
      when 'percent' then round(v_current_revision.amount * (1 + p_value / 100.0), 2)
      when 'fixed'   then v_current_revision.amount + p_value
      when 'set'     then p_value
    end;

    if v_new_amount is null or v_new_amount <= 0 then
      raise exception using message = 'amount_must_be_positive:' || v_contract_id;
    end if;

    -- Cerrar vigente + abrir nueva.
    update public.staff_contract_revisions
       set end_date = p_effective_date - interval '1 day'
     where id = v_current_revision.id;

    insert into public.staff_contract_revisions (
      club_id, contract_id, amount, effective_date, end_date,
      reason, created_by_user_id
    ) values (
      v_club_id, v_contract_id, v_new_amount, p_effective_date, null,
      p_reason, v_actor
    ) returning id into v_new_revision_id;

    update public.staff_contracts
       set updated_at = now(),
           updated_by_user_id = coalesce(v_actor, updated_by_user_id)
     where id = v_contract_id;

    v_created := v_created + 1;
    v_created_ids := v_created_ids || jsonb_build_object(
      'contract_id', v_contract_id,
      'revision_id', v_new_revision_id,
      'previous_amount', v_current_revision.amount,
      'new_amount', v_new_amount
    );
  end loop;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_batch', gen_random_uuid(), 'SALARY_REVISION_BULK',
    json_build_object(
      'adjustment_type', p_adjustment_type::text,
      'value', p_value,
      'effective_date', p_effective_date,
      'reason', p_reason,
      'created_count', v_created,
      'created', v_created_ids
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'bulk_created',
    'created_count', v_created,
    'created', v_created_ids
  );
end;
$$;

-- =========================================================================
-- D. Reemplazar hr_generate_monthly_settlements: lee de revisiones
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
    select c.id, c.staff_member_id, c.salary_structure_id,
           c.start_date, c.end_date,
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
    else
      -- Buscar la revisión vigente al primer día del período.
      -- Vigente = effective_date <= period_start AND (end_date is null OR end_date >= period_start).
      select amount
        into v_base_amount
      from public.staff_contract_revisions
      where contract_id = v_contract.id
        and effective_date <= v_period_start
        and (end_date is null or end_date >= v_period_start)
      order by effective_date desc
      limit 1;

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
-- E. hr_finalize_contract: además cierra la revisión vigente
-- =========================================================================

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

  select id, club_id, staff_member_id, salary_structure_id,
         start_date, end_date, status
    into v_contract
  from public.staff_contracts
  where id = p_contract_id;

  if v_contract.id is null then
    return json_build_object('ok', false, 'code', 'contract_not_found');
  end if;

  v_club_id := v_contract.club_id;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_contract.status = 'finalizado' then
    return json_build_object('ok', false, 'code', 'already_finalized');
  end if;

  if p_end_date is null then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_end_date < v_contract.start_date then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_end_date > (v_contract.start_date + interval '10 years')::date then
    return json_build_object('ok', false, 'code', 'end_date_too_far');
  end if;

  update public.staff_contracts
     set status = 'finalizado',
         end_date = p_end_date,
         finalized_at = now(),
         finalized_reason = p_reason,
         finalized_by_user_id = v_actor,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_contract_id;

  -- Cerrar la revisión vigente (si existe).
  update public.staff_contract_revisions
     set end_date = p_end_date
   where contract_id = p_contract_id
     and end_date is null;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'staff_contract', p_contract_id, 'CONTRACT_FINALIZED',
    json_build_object('status', 'vigente', 'end_date', v_contract.end_date)::jsonb,
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

-- =========================================================================
-- F. Job diario: además cierra revisión vigente del contrato finalizado
-- =========================================================================

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
  v_today := (timezone('America/Argentina/Buenos_Aires', now()))::date;

  insert into public.hr_job_runs (
    job_name, status, contracts_processed, contracts_failed
  ) values (
    'hr_finalize_contracts_due_today', 'running', 0, 0
  ) returning id into v_run_id;

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

      -- Cerrar revisión vigente.
      update public.staff_contract_revisions
         set end_date = v_contract.end_date
       where contract_id = v_contract.id
         and end_date is null;

      insert into public.hr_activity_log (
        club_id, entity_type, entity_id, action,
        payload_before, payload_after, performed_by_user_id
      ) values (
        v_contract.club_id, 'staff_contract', v_contract.id, 'CONTRACT_FINALIZED_AUTO',
        json_build_object('status', 'vigente', 'end_date', v_contract.end_date)::jsonb,
        json_build_object('status', 'finalizado', 'finalized_reason', 'auto_finalized_by_end_date')::jsonb,
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
