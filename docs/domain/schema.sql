-- =========================================
-- EXTENSIONS
-- =========================================

create extension if not exists "uuid-ossp";

-- =========================================
-- ENUMS
-- =========================================

create type membership_role as enum ('admin', 'secretaria', 'tesoreria');
create type membership_status as enum ('pendiente_aprobacion', 'activo', 'inactivo');

create type account_type as enum ('efectivo', 'bancaria', 'billetera_virtual', 'otra');
-- Legacy enum kept for backward compatibility while visibility is driven by
-- `visible_for_secretaria` and `visible_for_tesoreria`.
create type account_scope as enum ('secretaria', 'tesoreria');

create type movement_type as enum ('ingreso', 'egreso');
create type category_movement_type as enum ('ingreso', 'egreso', 'saldo');
create type movement_origin_role as enum ('secretaria', 'tesoreria', 'system');
create type movement_origin_source as enum ('manual', 'transfer', 'fx', 'adjustment', 'consolidation');

create type movement_status as enum (
'pending_consolidation',
'integrated',
'consolidated',
'posted',
'cancelled'
);

create type session_status as enum ('open', 'closed');

create type session_close_type as enum ('manual', 'auto');

create type balance_moment as enum ('opening', 'closing');

create type consolidation_status as enum ('pending', 'completed', 'failed');

create type receipt_validation_type as enum ('numeric', 'pattern');

create type cost_center_type as enum (
'deuda',
'evento',
'jornada',
'presupuesto',
'publicidad',
'sponsor'
);

create type cost_center_status as enum ('activo', 'inactivo');

create type cost_center_periodicity as enum (
'unico',
'mensual',
'trimestral',
'semestral',
'anual'
);

-- =========================================
-- USERS & CLUBS
-- =========================================

create table users (
id uuid primary key default uuid_generate_v4(),
email text not null unique,
full_name text,
avatar_url text,
created_at timestamp default now(),
updated_at timestamp default now()
);

create table clubs (
id uuid primary key default uuid_generate_v4(),
name text not null,
slug text not null unique,
status text default 'active',
cuit text,
tipo text check (
  tipo is null or tipo in ('asociacion_civil', 'fundacion', 'sociedad_civil')
),
logo_url text,
color_primary text,
color_secondary text,
domicilio text,
email text,
telefono text,
-- Moneda canónica del club (Fase 0 RRHH). Check ARS|USD, default ARS.
currency_code text not null default 'ARS' check (currency_code in ('ARS','USD')),
created_at timestamp default now(),
updated_at timestamp default now()
);

create table memberships (
id uuid primary key default uuid_generate_v4(),
user_id uuid not null references users(id),
club_id uuid not null references clubs(id),
role membership_role not null,
status membership_status not null,
joined_at timestamp,
approved_at timestamp,
approved_by_user_id uuid references users(id),
created_at timestamp default now(),
updated_at timestamp default now(),
unique (user_id, club_id)
);

create table membership_roles (
id uuid primary key default uuid_generate_v4(),
membership_id uuid not null references memberships(id) on delete cascade,
role membership_role not null,
created_at timestamp default now(),
unique (membership_id, role)
);

create table club_invitations (
id uuid primary key default uuid_generate_v4(),
club_id uuid not null references clubs(id),
email text not null,
role membership_role not null,
status text not null,
expires_at timestamp,
used_at timestamp,
created_at timestamp default now()
);

create table user_club_preferences (
user_id uuid primary key references users(id),
last_active_club_id uuid references clubs(id)
);

-- =========================================
-- CONFIGURACIÓN TESORERÍA
-- =========================================

create table treasury_accounts (
id uuid primary key default uuid_generate_v4(),
club_id uuid not null references clubs(id),
name text not null,
account_type account_type not null,
-- Legacy field kept for compatibility. Business logic must resolve account
-- visibility from `visible_for_secretaria` and `visible_for_tesoreria`.
account_scope account_scope not null,
-- Legacy field kept for compatibility. Business logic must resolve
-- availability only from role visibility.
status text not null,
visible_for_secretaria boolean default true,
visible_for_tesoreria boolean default true,
emoji text,
bank_entity text,
bank_account_subtype text,
account_number text,
cbu_cvu text,
created_at timestamp default now(),
unique (club_id, name)
);

create table treasury_account_currencies (
id uuid primary key default uuid_generate_v4(),
account_id uuid references treasury_accounts(id),
currency_code text not null,
initial_balance numeric(18, 2) not null default 0
);

create table treasury_categories (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
name text not null,
sub_category_name text not null,
description text not null,
parent_category text not null,
movement_type category_movement_type not null,
-- Legacy field kept for compatibility. Business logic must resolve
-- availability only from role visibility.
status text not null,
visible_for_secretaria boolean default true,
visible_for_tesoreria boolean default true,
emoji text,
is_system boolean not null default false,
is_legacy boolean not null default false,
unique (club_id, name)
);

create table club_activities (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
name text not null,
-- Legacy field kept for compatibility. Business logic must resolve
-- availability only from role visibility.
status text not null,
visible_for_secretaria boolean default true,
visible_for_tesoreria boolean default false,
emoji text
);

create table club_calendar_events (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
title text,
starts_at timestamp,
ends_at timestamp,
is_enabled_for_treasury boolean default false
);

create table receipt_formats (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
name text,
validation_type receipt_validation_type,
pattern text,
min_numeric_value numeric,
example text,
status text,
visible_for_secretaria boolean default true,
visible_for_tesoreria boolean default false
);

create table club_treasury_currencies (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
currency_code text not null,
is_primary boolean default false
);

create table club_movement_type_config (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
movement_type movement_type,
is_enabled boolean
);

-- =========================================
-- OPERATIVA DIARIA
-- =========================================

create table daily_cash_sessions (
id uuid primary key default uuid_generate_v4(),
club_id uuid not null references clubs(id),
session_date date not null,
status session_status not null,
opened_at timestamp not null default now(),
closed_at timestamp,
opened_by_user_id uuid references users(id),
closed_by_user_id uuid references users(id),
close_type session_close_type not null default 'manual',
notes text,
unique (club_id, session_date)
);

create table daily_cash_session_balances (
id uuid primary key default uuid_generate_v4(),
session_id uuid references daily_cash_sessions(id),
account_id uuid references treasury_accounts(id),
currency_code text,
balance_moment balance_moment,
expected_balance numeric,
declared_balance numeric,
difference_amount numeric
);

-- =========================================
-- MOVIMIENTOS
-- =========================================

create table treasury_movements (
id uuid primary key default uuid_generate_v4(),
display_id text not null,
club_id uuid not null references clubs(id),

origin_role movement_origin_role not null,
origin_source movement_origin_source not null,

daily_cash_session_id uuid references daily_cash_sessions(id),

account_id uuid references treasury_accounts(id),
movement_type movement_type not null,
category_id uuid references treasury_categories(id),

concept text,
currency_code text not null,
amount numeric not null check (amount > 0),

movement_date date not null,
created_by_user_id uuid references users(id),

status movement_status not null,

receipt_number text,
activity_id uuid references club_activities(id),
calendar_event_id uuid references club_calendar_events(id),

transfer_group_id uuid,
fx_operation_group_id uuid,
consolidation_batch_id uuid,

created_at timestamp default now()
);

-- =========================================
-- AJUSTES
-- =========================================

create table balance_adjustments (
id uuid primary key default uuid_generate_v4(),
session_id uuid references daily_cash_sessions(id),
movement_id uuid references treasury_movements(id),
account_id uuid references treasury_accounts(id),
difference_amount numeric,
adjustment_moment balance_moment
);

-- =========================================
-- OPERACIONES COMPUESTAS
-- =========================================

create table account_transfers (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
source_account_id uuid references treasury_accounts(id),
target_account_id uuid references treasury_accounts(id),
currency_code text,
amount numeric,
concept text,
created_at timestamp default now()
);

create table fx_operations (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
source_account_id uuid,
target_account_id uuid,
source_amount numeric,
target_amount numeric,
created_at timestamp default now()
);

-- =========================================
-- CONSOLIDACIÓN
-- =========================================

create table daily_consolidation_batches (
id uuid primary key default uuid_generate_v4(),
club_id uuid references clubs(id),
consolidation_date date not null,
status consolidation_status,
executed_at timestamp,
executed_by_user_id uuid references users(id),
error_message text,
unique (club_id, consolidation_date)
);

create table movement_integrations (
id uuid primary key default uuid_generate_v4(),
secretaria_movement_id uuid references treasury_movements(id),
tesoreria_movement_id uuid references treasury_movements(id),
integrated_at timestamp default now()
);

create table movement_audit_logs (
id uuid primary key default uuid_generate_v4(),
movement_id uuid references treasury_movements(id),
action_type text,
payload_before jsonb,
payload_after jsonb,
performed_by_user_id uuid references users(id),
performed_at timestamp default now()
);

-- =========================================
-- CENTROS DE COSTO (US-52 / US-53)
-- =========================================

create table cost_centers (
id uuid primary key default uuid_generate_v4(),
club_id uuid not null references clubs(id) on delete cascade,
name text not null,
description text,
type cost_center_type not null,
status cost_center_status not null default 'activo',
start_date date not null,
end_date date,
currency_code text not null,
amount numeric(18, 2),
periodicity cost_center_periodicity,
responsible_user_id uuid references users(id),
created_by_user_id uuid references users(id),
updated_by_user_id uuid references users(id),
created_at timestamp not null default now(),
updated_at timestamp not null default now(),
constraint cost_centers_end_date_gte_start
  check (end_date is null or end_date >= start_date),
constraint cost_centers_amount_required_by_type
  check (
    (type in ('deuda', 'presupuesto', 'publicidad', 'sponsor') and amount is not null)
    or (type in ('evento', 'jornada'))
  ),
constraint cost_centers_periodicity_by_type
  check (
    (type in ('presupuesto', 'publicidad', 'sponsor'))
    or periodicity is null
  )
);

-- Nombre único por club (case-insensitive, trimeado).
create unique index cost_centers_club_name_ci_uidx
on cost_centers (club_id, lower(trim(name)));

create table treasury_movement_cost_centers (
movement_id uuid not null references treasury_movements(id) on delete cascade,
cost_center_id uuid not null references cost_centers(id) on delete cascade,
created_at timestamp not null default now(),
created_by_user_id uuid references users(id),
primary key (movement_id, cost_center_id)
);

create table cost_center_audit_log (
id uuid primary key default uuid_generate_v4(),
cost_center_id uuid not null references cost_centers(id) on delete cascade,
actor_user_id uuid references users(id),
action_type text not null check (action_type in ('created', 'updated', 'closed')),
field text,
old_value text,
new_value text,
payload_before jsonb,
payload_after jsonb,
changed_at timestamp not null default now()
);

-- =========================================
-- INDEXES (IMPORTANTES PARA PERFORMANCE)
-- =========================================

create index idx_movements_club on treasury_movements(club_id);
create index idx_movements_account on treasury_movements(account_id);
create index idx_movements_session on treasury_movements(daily_cash_session_id);
create index idx_movements_status on treasury_movements(status);
create index idx_movements_club_account_created_at on treasury_movements(club_id, account_id, created_at desc);
create index idx_movements_club_date_created_at on treasury_movements(club_id, movement_date, created_at desc);
create index idx_movements_club_date on treasury_movements(club_id, movement_date);
create index idx_movements_club_display_id on treasury_movements(club_id, display_id);

create index idx_memberships_user on memberships(user_id);
create index idx_memberships_club on memberships(club_id);

create index idx_accounts_club on treasury_accounts(club_id);

create index idx_cost_centers_club on cost_centers(club_id);
create index idx_cost_centers_club_status on cost_centers(club_id, status);
create index idx_cost_centers_responsible on cost_centers(responsible_user_id);

create index idx_movement_cc_cost_center on treasury_movement_cost_centers(cost_center_id);
create index idx_movement_cc_movement on treasury_movement_cost_centers(movement_id);

create index idx_cost_center_audit_cc on cost_center_audit_log(cost_center_id, changed_at desc);

-- =========================================
-- E04 RRHH · Módulo de Recursos Humanos
-- (Fases 1-7 · US-54 a US-69)
-- =========================================

-- Enums
create type salary_remuneration_type as enum ('mensual_fijo','por_hora','por_clase');
create type salary_structure_status as enum ('activa','inactiva');
create type salary_payment_type as enum ('sueldo','viatico','honorarios');
create type staff_vinculo_type as enum ('relacion_dependencia','monotributista','honorarios','contrato_locacion');
create type staff_contract_status as enum ('vigente','finalizado');
create type payroll_settlement_status as enum ('generada','aprobada_rrhh','pagada','anulada');
create type payroll_adjustment_type as enum ('adicional','descuento','reintegro');
create type hr_job_run_status as enum ('running','success','partial','failed');

-- Catálogo de posiciones rentadas del club (US-54). Unique parcial en
-- (club_id, lower(trim(functional_role)), divisions, coalesce(activity_id::text, ''))
-- where status='activa'. El name se deriva automáticamente de
-- functional_role + divisions + activity_name; en edit se puede override.
-- activity_id es nullable: existen roles sin actividad deportiva
-- (abogado, administrativo, prensa, sereno, etc.).
create table salary_structures (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  functional_role text not null,
  activity_id uuid references club_activities(id),
  divisions text[] not null default '{}',
  payment_type salary_payment_type not null default 'sueldo',
  remuneration_type salary_remuneration_type not null,
  workload_hours numeric(10,2),
  status salary_structure_status not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id)
);

-- Revisiones salariales por contrato (US-34/US-35). Unique parcial
-- garantiza una única revisión vigente (end_date is null) por contrato.
-- La estructura salarial ya no guarda monto — el monto vive siempre en
-- staff_contract_revisions (inicial creada en alta de contrato,
-- actualizaciones via RPC hr_create_salary_revision o bulk RPC).
create table staff_contract_revisions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  contract_id uuid not null references staff_contracts(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  effective_date date not null,
  end_date date,
  reason text,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references users(id),
  constraint staff_contract_revisions_date_order check (
    end_date is null or end_date >= effective_date
  )
);

-- Enum de tipos de ajuste para la revisión masiva (US-35).
create type salary_revision_adjustment_type as enum ('percent','fixed','set');

-- Colaboradores del club (US-56). Unique en (club_id, dni) y unique parcial en
-- (club_id, cuit_cuil) where cuit_cuil is not null.
-- No se maneja soft-delete: los colaboradores se crean y se editan pero no
-- se dan de baja.
create table staff_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text not null,
  cuit_cuil text,
  email text,
  phone text,
  vinculo_type staff_vinculo_type not null,
  cbu_alias text,
  hire_date date not null default current_date,
  -- US-31 (ex US-56) · El colaborador NO tiene estado activo/inactivo.
  -- Si no tiene contratos vigentes, aparece marcado en el listado vía
  -- toggle "con contrato vigente / todos" (US-31 Scenario 4) y la
  -- alerta US-37. Migración 20260427030000 dropea el soft-delete legacy.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id)
);

-- Contratos (US-57/58). Unique parcial (salary_structure_id) where
-- status='vigente' garantiza una única ocupación activa por estructura.
-- El monto NO vive acá — se gestiona a nivel revisión (staff_contract_revisions).
-- La RPC hr_create_contract_with_initial_revision inserta contrato +
-- primera revisión en una sola transacción.
create table staff_contracts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id),
  salary_structure_id uuid not null references salary_structures(id),
  start_date date not null,
  end_date date,
  status staff_contract_status not null default 'vigente',
  finalized_at timestamptz,
  finalized_reason text,
  finalized_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  constraint staff_contracts_amount_coherent check (uses_structure_amount = true or frozen_amount is not null),
  constraint staff_contracts_date_order check (end_date is null or end_date >= start_date)
);

-- Liquidaciones mensuales (US-61..66). Unique parcial
-- (contract_id, period_year, period_month) where status<>'anulada'
-- permite regenerar tras anular.
create table payroll_settlements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  contract_id uuid not null references staff_contracts(id),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  base_amount numeric(18,2) not null default 0,
  adjustments_total numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  hours_worked numeric(10,2) default 0,
  classes_worked int default 0,
  requires_hours_input boolean not null default false,
  notes text,
  status payroll_settlement_status not null default 'generada',
  -- US-63 (Notion alias US-40): rename 2026-04-27 confirmed_* → approved_*
  approved_at timestamptz,
  approved_by_user_id uuid references users(id),
  -- US-70 (Notion alias US-41, NUEVA 2026-04-27): devolución a "generada" con motivo.
  -- Cuando se devuelve, status vuelve a 'generada', approved_* se
  -- resetea a null y se setean returned_*. Indicador visual en UI:
  -- "Devuelta por [rol]" en filas con status='generada' + returned_by_role≠null.
  returned_at timestamptz,
  returned_by_user_id uuid references users(id),
  returned_by_role text check (returned_by_role is null or returned_by_role in ('rrhh','tesoreria')),
  returned_reason text,
  paid_at timestamptz,
  paid_movement_id uuid,
  annulled_at timestamptz,
  annulled_by_user_id uuid references users(id),
  annulled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id)
);

-- Ajustes sobre liquidaciones (US-62). Trigger hr_recalc_settlement_totals
-- recalcula adjustments_total + total_amount en el padre tras insert/
-- update/delete.
create table payroll_settlement_adjustments (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references payroll_settlements(id) on delete cascade,
  type payroll_adjustment_type not null,
  concept text not null,
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references users(id)
);

-- Agrupador de pagos en lote (US-65). Un batch agrupa N settlements que
-- se pagaron en una única operación transaccional.
create table payroll_payment_batches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  account_id uuid not null references treasury_accounts(id),
  payment_date date not null,
  notes text,
  total_amount numeric(18,2) not null,
  settlement_count int not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references users(id)
);

-- Audit log append-only de RRHH. entity_type distingue la entidad
-- (salary_structure, staff_member, staff_contract, payroll_settlement,
-- payroll_batch). action describe el evento (CREATED, UPDATED,
-- AMOUNT_UPDATED, CONTRACT_FINALIZED, SETTLEMENT_CONFIRMED, etc.).
create table hr_activity_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload_before jsonb,
  payload_after jsonb,
  performed_by_user_id uuid references users(id),
  performed_at timestamptz not null default now()
);

-- Bitácora de corridas del job pg_cron (US-59). Sin policy RLS
-- expuesta al cliente (deny-all); acceso restringido a RPCs SECURITY
-- DEFINER.
create table hr_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status hr_job_run_status not null default 'running',
  contracts_processed int not null default 0,
  contracts_failed int not null default 0,
  error_payload jsonb
);

-- Extensiones sobre treasury_movements para enlazar pagos RRHH (US-64/65).
-- Unique parcial en payroll_settlement_id garantiza que una liquidación
-- no pueda pagarse dos veces.
alter table treasury_movements
  add column payroll_settlement_id uuid references payroll_settlements(id),
  add column payroll_payment_batch_id uuid references payroll_payment_batches(id);

-- Rol rrhh agregado al enum membership_role:
-- alter type membership_role add value 'rrhh';

-- Índices RRHH
create unique index salary_structures_unique_active_role_div_activity
  on salary_structures (
    club_id,
    lower(trim(functional_role)),
    divisions,
    coalesce(activity_id::text, '')
  )
  where status = 'activa';
create index idx_salary_structures_club_status on salary_structures (club_id, status);
create index idx_salary_structures_club_activity on salary_structures (club_id, activity_id);

create unique index salary_structure_versions_unique_current
  on salary_structure_versions (salary_structure_id) where end_date is null;
create index idx_salary_structure_versions_structure_start
  on salary_structure_versions (salary_structure_id, start_date desc);

create unique index staff_members_unique_dni
  on staff_members (club_id, dni);
create unique index staff_members_unique_cuit
  on staff_members (club_id, cuit_cuil) where cuit_cuil is not null;
create index idx_staff_members_club_name on staff_members (club_id, last_name, first_name);

create unique index staff_contracts_unique_active_per_structure
  on staff_contracts (salary_structure_id) where status = 'vigente';
create index idx_staff_contracts_club_status on staff_contracts (club_id, status);
create index idx_staff_contracts_member_status on staff_contracts (staff_member_id, status);
create index idx_staff_contracts_active_period
  on staff_contracts (club_id, start_date, end_date) where status = 'vigente';

create unique index payroll_settlements_unique_non_annulled
  on payroll_settlements (contract_id, period_year, period_month) where status <> 'anulada';
create index idx_payroll_settlements_club_status on payroll_settlements (club_id, status);
create index idx_payroll_settlements_club_period
  on payroll_settlements (club_id, period_year, period_month);

create index idx_payroll_settlement_adjustments_settlement
  on payroll_settlement_adjustments (settlement_id);

create index idx_payroll_payment_batches_club_date
  on payroll_payment_batches (club_id, payment_date desc);

create index idx_hr_activity_log_club_entity
  on hr_activity_log (club_id, entity_type, entity_id, performed_at desc);

create index idx_hr_job_runs_name_started on hr_job_runs (job_name, started_at desc);

create unique index treasury_movements_unique_payroll_settlement
  on treasury_movements (payroll_settlement_id) where payroll_settlement_id is not null;
create index idx_treasury_movements_payroll_batch
  on treasury_movements (payroll_payment_batch_id) where payroll_payment_batch_id is not null;
