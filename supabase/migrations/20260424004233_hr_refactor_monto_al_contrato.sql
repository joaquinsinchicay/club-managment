drop function if exists public.hr_update_salary_structure_amount(uuid, numeric, date);
drop view if exists public.salary_structure_current_amount;
drop index if exists public.salary_structure_versions_unique_current;
drop index if exists public.salary_structure_versions_structure_start_idx;
drop table if exists public.salary_structure_versions cascade;

alter table public.staff_contracts drop constraint if exists staff_contracts_amount_coherent;

alter table public.staff_contracts
  drop column if exists uses_structure_amount,
  drop column if exists frozen_amount;

create type public.salary_revision_adjustment_type as enum ('percent', 'fixed', 'set');

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
