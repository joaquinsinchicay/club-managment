-- Fase 1 · E04 RRHH · Schema base
--
-- Crea toda la estructura de datos del módulo RRHH:
--   · enums: salary_remuneration_type, salary_structure_status,
--            staff_vinculo_type, staff_member_status, staff_contract_status,
--            payroll_settlement_status, payroll_adjustment_type
--   · tablas: salary_structures, salary_structure_versions,
--             staff_members, staff_contracts, payroll_settlements,
--             payroll_settlement_adjustments, payroll_payment_batches,
--             hr_activity_log, hr_job_runs
--   · extensiones sobre treasury_movements: payroll_settlement_id (unique
--     parcial) y payroll_payment_batch_id.
--   · vista salary_structure_current_amount.
--   · RLS club-scoped en todas las tablas nuevas.
--   · RPCs SECURITY DEFINER (stubs) para las operaciones de RRHH. Cada stub
--     devuelve {ok:false, code:'not_implemented'} y será reemplazado por
--     la lógica real en las fases siguientes (Fase 2-7).
--   · Schedule pg_cron de finalización automática (US-59) apuntando al
--     stub hr_finalize_contracts_due_today_all_clubs; el stub hace no-op
--     hasta Fase 6.
--
-- Toda tabla tiene club_id + policy
-- `using (club_id = current_setting('app.current_club_id', true)::uuid)`
-- reproduciendo el patrón de cost_centers (migration 20260420170000).

-- =========================================================================
-- 1. Extensiones
-- =========================================================================

create extension if not exists pg_cron;

-- =========================================================================
-- 2. Enums
-- =========================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'salary_remuneration_type') then
    create type public.salary_remuneration_type as enum ('mensual_fijo','por_hora','por_clase');
  end if;
  if not exists (select 1 from pg_type where typname = 'salary_structure_status') then
    create type public.salary_structure_status as enum ('activa','inactiva');
  end if;
  if not exists (select 1 from pg_type where typname = 'staff_vinculo_type') then
    create type public.staff_vinculo_type as enum ('relacion_dependencia','monotributista','honorarios');
  end if;
  if not exists (select 1 from pg_type where typname = 'staff_member_status') then
    create type public.staff_member_status as enum ('activo','inactivo');
  end if;
  if not exists (select 1 from pg_type where typname = 'staff_contract_status') then
    create type public.staff_contract_status as enum ('vigente','finalizado');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_settlement_status') then
    create type public.payroll_settlement_status as enum ('generada','confirmada','pagada','anulada');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_adjustment_type') then
    create type public.payroll_adjustment_type as enum ('adicional','descuento','reintegro');
  end if;
  if not exists (select 1 from pg_type where typname = 'hr_job_run_status') then
    create type public.hr_job_run_status as enum ('running','success','partial','failed');
  end if;
end $$;

-- =========================================================================
-- 3. Tablas
-- =========================================================================

-- 3.1 salary_structures (US-54) ---------------------------------------------
create table if not exists public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  functional_role text not null,
  activity_id uuid not null references public.activities(id),
  remuneration_type public.salary_remuneration_type not null,
  workload_hours numeric(10,2) null,
  status public.salary_structure_status not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id)
);

create unique index if not exists salary_structures_unique_active_role_activity
  on public.salary_structures (club_id, lower(trim(functional_role)), activity_id)
  where status = 'activa';
create index if not exists salary_structures_club_status_idx
  on public.salary_structures (club_id, status);
create index if not exists salary_structures_club_activity_idx
  on public.salary_structures (club_id, activity_id);

-- 3.2 salary_structure_versions (US-55) -------------------------------------
create table if not exists public.salary_structure_versions (
  id uuid primary key default gen_random_uuid(),
  salary_structure_id uuid not null references public.salary_structures(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  start_date date not null,
  end_date date null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id)
);

create unique index if not exists salary_structure_versions_unique_current
  on public.salary_structure_versions (salary_structure_id)
  where end_date is null;
create index if not exists salary_structure_versions_structure_start_idx
  on public.salary_structure_versions (salary_structure_id, start_date desc);

-- 3.3 staff_members (US-56) -------------------------------------------------
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text not null,
  cuit_cuil text not null,
  email text null,
  phone text null,
  vinculo_type public.staff_vinculo_type not null,
  cbu_alias text null,
  hire_date date not null default current_date,
  status public.staff_member_status not null default 'activo',
  deactivated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id)
);

create unique index if not exists staff_members_unique_active_dni
  on public.staff_members (club_id, dni)
  where status = 'activo';
create unique index if not exists staff_members_unique_active_cuit
  on public.staff_members (club_id, cuit_cuil)
  where status = 'activo';
create index if not exists staff_members_club_status_idx
  on public.staff_members (club_id, status);
create index if not exists staff_members_club_name_idx
  on public.staff_members (club_id, last_name, first_name);

-- 3.4 staff_contracts (US-57 / US-58) ---------------------------------------
create table if not exists public.staff_contracts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id),
  salary_structure_id uuid not null references public.salary_structures(id),
  start_date date not null,
  end_date date null,
  uses_structure_amount boolean not null default true,
  frozen_amount numeric(18,2) null,
  status public.staff_contract_status not null default 'vigente',
  finalized_at timestamptz null,
  finalized_reason text null,
  finalized_by_user_id uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id),
  constraint staff_contracts_amount_coherent check (
    uses_structure_amount = true or frozen_amount is not null
  ),
  constraint staff_contracts_date_order check (
    end_date is null or end_date >= start_date
  )
);

create unique index if not exists staff_contracts_unique_active_per_structure
  on public.staff_contracts (salary_structure_id)
  where status = 'vigente';
create index if not exists staff_contracts_club_status_idx
  on public.staff_contracts (club_id, status);
create index if not exists staff_contracts_member_status_idx
  on public.staff_contracts (staff_member_id, status);
create index if not exists staff_contracts_active_period_idx
  on public.staff_contracts (club_id, start_date, end_date)
  where status = 'vigente';

-- 3.5 payroll_settlements (US-61..US-66) ------------------------------------
create table if not exists public.payroll_settlements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  contract_id uuid not null references public.staff_contracts(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  base_amount numeric(18,2) not null default 0,
  adjustments_total numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  hours_worked numeric(10,2) default 0,
  classes_worked int default 0,
  requires_hours_input boolean not null default false,
  notes text null,
  status public.payroll_settlement_status not null default 'generada',
  confirmed_at timestamptz null,
  confirmed_by_user_id uuid null references public.users(id),
  paid_at timestamptz null,
  paid_movement_id uuid null,
  annulled_at timestamptz null,
  annulled_by_user_id uuid null references public.users(id),
  annulled_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id),
  constraint payroll_settlements_total_non_negative check (total_amount >= 0)
);

create unique index if not exists payroll_settlements_unique_non_annulled
  on public.payroll_settlements (contract_id, period_year, period_month)
  where status <> 'anulada';
create index if not exists payroll_settlements_club_status_idx
  on public.payroll_settlements (club_id, status);
create index if not exists payroll_settlements_club_period_idx
  on public.payroll_settlements (club_id, period_year, period_month);

-- 3.6 payroll_settlement_adjustments (US-62) --------------------------------
create table if not exists public.payroll_settlement_adjustments (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.payroll_settlements(id) on delete cascade,
  type public.payroll_adjustment_type not null,
  concept text not null,
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id)
);

create index if not exists payroll_settlement_adjustments_settlement_idx
  on public.payroll_settlement_adjustments (settlement_id);

-- 3.7 payroll_payment_batches (US-65) ---------------------------------------
create table if not exists public.payroll_payment_batches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  account_id uuid not null references public.treasury_accounts(id),
  payment_date date not null,
  notes text null,
  total_amount numeric(18,2) not null,
  settlement_count int not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references public.users(id)
);

create index if not exists payroll_payment_batches_club_date_idx
  on public.payroll_payment_batches (club_id, payment_date desc);

-- 3.8 hr_activity_log --------------------------------------------------------
create table if not exists public.hr_activity_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload_before jsonb null,
  payload_after jsonb null,
  performed_by_user_id uuid null references public.users(id),
  performed_at timestamptz not null default now()
);

create index if not exists hr_activity_log_club_entity_idx
  on public.hr_activity_log (club_id, entity_type, entity_id, performed_at desc);

-- 3.9 hr_job_runs (US-59) ---------------------------------------------------
create table if not exists public.hr_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status public.hr_job_run_status not null default 'running',
  contracts_processed int not null default 0,
  contracts_failed int not null default 0,
  error_payload jsonb null
);

create index if not exists hr_job_runs_name_started_idx
  on public.hr_job_runs (job_name, started_at desc);

-- =========================================================================
-- 4. Extensiones a treasury_movements (US-64 / US-65)
-- =========================================================================

alter table public.treasury_movements
  add column if not exists payroll_settlement_id uuid null
    references public.payroll_settlements(id);

alter table public.treasury_movements
  add column if not exists payroll_payment_batch_id uuid null
    references public.payroll_payment_batches(id);

create unique index if not exists treasury_movements_unique_payroll_settlement
  on public.treasury_movements (payroll_settlement_id)
  where payroll_settlement_id is not null;
create index if not exists treasury_movements_payroll_batch_idx
  on public.treasury_movements (payroll_payment_batch_id)
  where payroll_payment_batch_id is not null;

-- =========================================================================
-- 5. Vista auxiliar salary_structure_current_amount (US-55)
-- =========================================================================

create or replace view public.salary_structure_current_amount as
select salary_structure_id, amount
from public.salary_structure_versions
where end_date is null;

-- =========================================================================
-- 6. RLS · club-scoped
-- =========================================================================

alter table public.salary_structures enable row level security;
alter table public.salary_structure_versions enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_contracts enable row level security;
alter table public.payroll_settlements enable row level security;
alter table public.payroll_settlement_adjustments enable row level security;
alter table public.payroll_payment_batches enable row level security;
alter table public.hr_activity_log enable row level security;
alter table public.hr_job_runs enable row level security;

-- Helper: current_club_id safe read
-- (ya existe convención en el repo; usamos current_setting con missing_ok)

drop policy if exists salary_structures_club_scope on public.salary_structures;
create policy salary_structures_club_scope on public.salary_structures
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists salary_structure_versions_club_scope on public.salary_structure_versions;
create policy salary_structure_versions_club_scope on public.salary_structure_versions
  as permissive for all to authenticated
  using (
    exists (
      select 1 from public.salary_structures ss
      where ss.id = salary_structure_versions.salary_structure_id
        and ss.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.salary_structures ss
      where ss.id = salary_structure_versions.salary_structure_id
        and ss.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
    )
  );

drop policy if exists staff_members_club_scope on public.staff_members;
create policy staff_members_club_scope on public.staff_members
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists staff_contracts_club_scope on public.staff_contracts;
create policy staff_contracts_club_scope on public.staff_contracts
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists payroll_settlements_club_scope on public.payroll_settlements;
create policy payroll_settlements_club_scope on public.payroll_settlements
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments;
create policy payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments
  as permissive for all to authenticated
  using (
    exists (
      select 1 from public.payroll_settlements ps
      where ps.id = payroll_settlement_adjustments.settlement_id
        and ps.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
    )
  )
  with check (
    exists (
      select 1 from public.payroll_settlements ps
      where ps.id = payroll_settlement_adjustments.settlement_id
        and ps.club_id = nullif(current_setting('app.current_club_id', true), '')::uuid
    )
  );

drop policy if exists payroll_payment_batches_club_scope on public.payroll_payment_batches;
create policy payroll_payment_batches_club_scope on public.payroll_payment_batches
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists hr_activity_log_club_scope on public.hr_activity_log;
create policy hr_activity_log_club_scope on public.hr_activity_log
  as permissive for select to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

-- hr_job_runs: sin policy pública (sólo se lee/escribe via RPC
-- SECURITY DEFINER). No se exponen rows directamente al cliente.

-- =========================================================================
-- 7. Trigger de recálculo de totals (US-62)
-- =========================================================================

create or replace function public.hr_recalc_settlement_totals()
returns trigger
language plpgsql
as $$
declare
  v_settlement_id uuid;
  v_adjustments_total numeric(18,2);
  v_base_amount numeric(18,2);
begin
  v_settlement_id := coalesce(new.settlement_id, old.settlement_id);

  select coalesce(sum(case when type = 'descuento' then -amount else amount end), 0)
    into v_adjustments_total
    from public.payroll_settlement_adjustments
    where settlement_id = v_settlement_id;

  select base_amount into v_base_amount
    from public.payroll_settlements
    where id = v_settlement_id;

  update public.payroll_settlements
     set adjustments_total = v_adjustments_total,
         total_amount = coalesce(v_base_amount, 0) + v_adjustments_total,
         updated_at = now()
   where id = v_settlement_id;

  return null;
end;
$$;

drop trigger if exists payroll_settlement_adjustments_recalc on public.payroll_settlement_adjustments;
create trigger payroll_settlement_adjustments_recalc
  after insert or update or delete on public.payroll_settlement_adjustments
  for each row execute function public.hr_recalc_settlement_totals();

-- =========================================================================
-- 8. RPCs (stubs no funcionales, se completan en Fases 2-7)
-- =========================================================================
-- Cada stub respeta la firma del PDD y devuelve {ok:false, code:'not_implemented'}
-- para permitir que el resto del stack (types, repositorios, UI) se construya
-- sin bloquear por la lógica final.

create or replace function public.hr_update_salary_structure_amount(
  p_structure_id uuid,
  p_new_amount numeric,
  p_effective_date date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

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
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

create or replace function public.hr_generate_monthly_settlements(
  p_year int,
  p_month int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented',
    'generated_count', 0, 'skipped_count', 0, 'error_count', 0);
end;
$$;

create or replace function public.hr_confirm_settlement(
  p_settlement_id uuid,
  p_confirm_zero boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

create or replace function public.hr_confirm_settlements_bulk(
  p_ids uuid[],
  p_confirm_zero boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented',
    'confirmed_count', 0, 'skipped_count', 0, 'errors', '[]'::jsonb);
end;
$$;

create or replace function public.hr_pay_settlement(
  p_settlement_id uuid,
  p_account_id uuid,
  p_payment_date date,
  p_receipt_number text,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

create or replace function public.hr_pay_settlements_batch(
  p_ids uuid[],
  p_account_id uuid,
  p_payment_date date,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

create or replace function public.hr_annul_settlement(
  p_settlement_id uuid,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return json_build_object('ok', false, 'code', 'not_implemented');
end;
$$;

-- Global job (US-59): itera todos los clubes y finaliza contratos con
-- end_date = current_date. Esta versión es el stub (no-op) que será
-- completada en Fase 6.
create or replace function public.hr_finalize_contracts_due_today_all_clubs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Stub Fase 1: registra la corrida sin procesar contratos.
  insert into public.hr_job_runs (job_name, status, contracts_processed, finished_at)
  values ('hr_finalize_contracts_due_today', 'success', 0, now());
end;
$$;

-- =========================================================================
-- 9. Schedule pg_cron (US-59)
-- =========================================================================
-- Dispara todos los días a las 03:05 UTC. La zona horaria efectiva se ajusta
-- dentro del RPC en Fase 6.
do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'hr-finalize-contracts'
  ) then
    perform cron.unschedule('hr-finalize-contracts');
  end if;

  perform cron.schedule(
    'hr-finalize-contracts',
    '5 3 * * *',
    $schedule$select public.hr_finalize_contracts_due_today_all_clubs()$schedule$
  );
exception
  when undefined_table then
    -- cron.job no existe todavía (pg_cron no terminó de bootstrappear).
    -- El schedule puede registrarse manualmente o al correr la migration
    -- una segunda vez.
    null;
end $$;

-- =========================================================================
-- 10. Seed de verificación: categoría "Sueldos"
-- =========================================================================
-- La categoría "Sueldos" debe existir como categoría de tesorería legacy.
-- Ver lib/treasury-system-categories.ts. Si por algún motivo no existe al
-- momento de correr esta migration, no se fuerza su creación aquí (es un
-- seed de aplicación). Sólo se deja esta nota como documentación.
