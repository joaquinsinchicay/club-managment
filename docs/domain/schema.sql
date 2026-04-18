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

create type balance_moment as enum ('opening', 'closing');

create type consolidation_status as enum ('pending', 'completed', 'failed');

create type receipt_validation_type as enum ('numeric', 'pattern');

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
created_at timestamp default now(),
unique (club_id, name)
);

create table treasury_account_currencies (
id uuid primary key default uuid_generate_v4(),
account_id uuid references treasury_accounts(id),
currency_code text not null
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
