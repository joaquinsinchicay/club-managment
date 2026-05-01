-- =========================================================================
-- US-52 / US-53 · Centros de Costo (Tesorería)
-- =========================================================================
-- Introduce la dimensión contable paralela a categorías y actividades para
-- imputar movimientos de tesorería a compromisos económicos acotados en el
-- tiempo (deudas, eventos, jornadas, presupuestos, publicidades, sponsors).
--
-- Crea:
--   * Enums: cost_center_type, cost_center_status, cost_center_periodicity.
--   * Tabla cost_centers (catálogo por club, operado por rol tesoreria).
--   * Tabla treasury_movement_cost_centers (relación N:M con movimientos).
--   * Tabla cost_center_audit_log (historial append-only).
--   * Indexes, constraints de integridad y RLS.
-- =========================================================================

-- -------------------------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'cost_center_type'
  ) then
    create type public.cost_center_type as enum (
      'deuda',
      'evento',
      'jornada',
      'presupuesto',
      'publicidad',
      'sponsor'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'cost_center_status'
  ) then
    create type public.cost_center_status as enum ('activo', 'inactivo');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'cost_center_periodicity'
  ) then
    create type public.cost_center_periodicity as enum (
      'unico',
      'mensual',
      'trimestral',
      'semestral',
      'anual'
    );
  end if;
end $$;

-- -------------------------------------------------------------------------
-- TABLE · cost_centers
-- -------------------------------------------------------------------------

create table if not exists public.cost_centers (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  type public.cost_center_type not null,
  status public.cost_center_status not null default 'activo',
  start_date date not null,
  end_date date,
  currency_code text not null,
  amount numeric(18, 2),
  periodicity public.cost_center_periodicity,
  responsible_user_id uuid references public.users(id),
  created_by_user_id uuid references public.users(id),
  updated_by_user_id uuid references public.users(id),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),

  -- Unicidad case-insensitive por club se refuerza con índice dedicado abajo.
  constraint cost_centers_end_date_gte_start
    check (end_date is null or end_date >= start_date),

  -- Monto obligatorio para tipos con objetivo financiero explícito.
  constraint cost_centers_amount_required_by_type
    check (
      (type in ('deuda', 'presupuesto', 'publicidad', 'sponsor') and amount is not null)
      or (type in ('evento', 'jornada'))
    ),

  -- Periodicidad solo aplica a tipos recurrentes.
  constraint cost_centers_periodicity_by_type
    check (
      (type in ('presupuesto', 'publicidad', 'sponsor'))
      or periodicity is null
    )
);

create unique index if not exists cost_centers_club_name_ci_uidx
  on public.cost_centers (club_id, lower(trim(name)));

create index if not exists idx_cost_centers_club
  on public.cost_centers (club_id);

create index if not exists idx_cost_centers_club_status
  on public.cost_centers (club_id, status);

create index if not exists idx_cost_centers_responsible
  on public.cost_centers (responsible_user_id);

-- -------------------------------------------------------------------------
-- TABLE · treasury_movement_cost_centers (N:M)
-- -------------------------------------------------------------------------

create table if not exists public.treasury_movement_cost_centers (
  movement_id uuid not null references public.treasury_movements(id) on delete cascade,
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  created_at timestamp not null default now(),
  created_by_user_id uuid references public.users(id),
  primary key (movement_id, cost_center_id)
);

create index if not exists idx_movement_cc_cost_center
  on public.treasury_movement_cost_centers (cost_center_id);

create index if not exists idx_movement_cc_movement
  on public.treasury_movement_cost_centers (movement_id);

-- -------------------------------------------------------------------------
-- TABLE · cost_center_audit_log (append-only)
-- -------------------------------------------------------------------------

create table if not exists public.cost_center_audit_log (
  id uuid primary key default uuid_generate_v4(),
  cost_center_id uuid not null references public.cost_centers(id) on delete cascade,
  actor_user_id uuid references public.users(id),
  action_type text not null check (action_type in ('created', 'updated', 'closed')),
  field text,
  old_value text,
  new_value text,
  payload_before jsonb,
  payload_after jsonb,
  changed_at timestamp not null default now()
);

create index if not exists idx_cost_center_audit_cc
  on public.cost_center_audit_log (cost_center_id, changed_at desc);

-- -------------------------------------------------------------------------
-- TRIGGER · keep updated_at in sync
-- -------------------------------------------------------------------------

create or replace function public.tg_cost_centers_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cost_centers_set_updated_at on public.cost_centers;
create trigger cost_centers_set_updated_at
before update on public.cost_centers
for each row execute function public.tg_cost_centers_set_updated_at();

-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------

alter table public.cost_centers enable row level security;
alter table public.treasury_movement_cost_centers enable row level security;
alter table public.cost_center_audit_log enable row level security;

-- cost_centers · lectura para cualquier miembro activo del club; mutaciones
-- solo para rol tesoreria.
drop policy if exists "Members can view cost centers" on public.cost_centers;
drop policy if exists "Treasury manage cost centers in current club" on public.cost_centers;

create policy "Members can view cost centers"
on public.cost_centers
for select
to authenticated
using (
  club_id = current_club_id()
  and is_member_of_current_club()
);

create policy "Treasury manage cost centers in current club"
on public.cost_centers
for all
to authenticated
using (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
)
with check (
  club_id = current_club_id()
  and (select current_user_has_role('tesoreria'))
);

-- treasury_movement_cost_centers · lectura para miembros cuando el CC y el
-- movimiento pertenecen al club activo; mutaciones solo para tesoreria.
drop policy if exists "Members can view movement cost center links" on public.treasury_movement_cost_centers;
drop policy if exists "Treasury manage movement cost center links" on public.treasury_movement_cost_centers;

create policy "Members can view movement cost center links"
on public.treasury_movement_cost_centers
for select
to authenticated
using (
  exists (
    select 1
    from public.cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and is_member_of_current_club()
);

create policy "Treasury manage movement cost center links"
on public.treasury_movement_cost_centers
for all
to authenticated
using (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from public.cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and exists (
    select 1
    from public.treasury_movements m
    where m.id = treasury_movement_cost_centers.movement_id
      and m.club_id = current_club_id()
  )
)
with check (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from public.cost_centers cc
    where cc.id = treasury_movement_cost_centers.cost_center_id
      and cc.club_id = current_club_id()
  )
  and exists (
    select 1
    from public.treasury_movements m
    where m.id = treasury_movement_cost_centers.movement_id
      and m.club_id = current_club_id()
  )
);

-- cost_center_audit_log · lectura para miembros del club dueño del CC;
-- inserción solo para tesoreria; nunca update/delete desde RLS (append-only).
drop policy if exists "Members can view cost center audit log" on public.cost_center_audit_log;
drop policy if exists "Treasury can insert cost center audit log" on public.cost_center_audit_log;

create policy "Members can view cost center audit log"
on public.cost_center_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.cost_centers cc
    where cc.id = cost_center_audit_log.cost_center_id
      and cc.club_id = current_club_id()
  )
  and is_member_of_current_club()
);

create policy "Treasury can insert cost center audit log"
on public.cost_center_audit_log
for insert
to authenticated
with check (
  (select current_user_has_role('tesoreria'))
  and exists (
    select 1
    from public.cost_centers cc
    where cc.id = cost_center_audit_log.cost_center_id
      and cc.club_id = current_club_id()
  )
);
