-- Fase 6 · E04 RRHH · US-32 (adjuntos)
-- Bucket privado + tabla de adjuntos vinculados a contratos. El file_path
-- sigue la convención {club_id}/{contract_id}/{uuid}-{filename} para que
-- las políticas puedan validar ownership por path.

insert into storage.buckets (id, name, public)
values ('staff-contracts', 'staff-contracts', false)
on conflict (id) do nothing;

create table if not exists public.staff_contract_attachments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  contract_id uuid not null references public.staff_contracts(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_at timestamptz not null default now(),
  uploaded_by_user_id uuid references public.users(id)
);

create index if not exists staff_contract_attachments_contract_idx
  on public.staff_contract_attachments (contract_id, uploaded_at desc);

alter table public.staff_contract_attachments enable row level security;

drop policy if exists staff_contract_attachments_club_scope on public.staff_contract_attachments;
create policy staff_contract_attachments_club_scope on public.staff_contract_attachments
  as permissive for all to authenticated
  using (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid)
  with check (club_id = nullif(current_setting('app.current_club_id', true), '')::uuid);

drop policy if exists "staff_contracts_bucket_no_direct_access" on storage.objects;
create policy "staff_contracts_bucket_no_direct_access" on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'staff-contracts');
