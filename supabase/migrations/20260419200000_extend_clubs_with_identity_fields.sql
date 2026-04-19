-- Extiende la tabla clubs con campos de identidad institucional y visual
-- (CUIT, tipo legal, logo, colores identificatorios). También crea el bucket
-- de Storage `club-logos` con policies RLS que permiten a los admins del club
-- gestionar el logo dentro del path `{club_id}/*`.

alter table public.clubs
  add column if not exists cuit text,
  add column if not exists tipo text,
  add column if not exists logo_url text,
  add column if not exists color_primary text,
  add column if not exists color_secondary text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clubs_tipo_check'
  ) then
    alter table public.clubs
      add constraint clubs_tipo_check
        check (
          tipo is null
          or tipo in ('asociacion_civil', 'fundacion', 'sociedad_civil')
        );
  end if;
end $$;

-- Bucket de logos: lectura publica, escritura restringida a admin del club.
insert into storage.buckets (id, name, public)
values ('club-logos', 'club-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "club_logos_public_read" on storage.objects;
create policy "club_logos_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'club-logos');

drop policy if exists "club_logos_admin_insert" on storage.objects;
create policy "club_logos_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'club-logos'
    and exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      where m.user_id = auth.uid()
        and m.status = 'activo'
        and mr.role = 'admin'
        and m.club_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "club_logos_admin_update" on storage.objects;
create policy "club_logos_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'club-logos'
    and exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      where m.user_id = auth.uid()
        and m.status = 'activo'
        and mr.role = 'admin'
        and m.club_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "club_logos_admin_delete" on storage.objects;
create policy "club_logos_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'club-logos'
    and exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      where m.user_id = auth.uid()
        and m.status = 'activo'
        and mr.role = 'admin'
        and m.club_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

-- Policy RLS sobre la tabla clubs: admin del club puede hacer UPDATE.
drop policy if exists "Admins can update their club identity" on public.clubs;
create policy "Admins can update their club identity"
  on public.clubs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      where m.user_id = auth.uid()
        and m.club_id = clubs.id
        and m.status = 'activo'
        and mr.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      where m.user_id = auth.uid()
        and m.club_id = clubs.id
        and m.status = 'activo'
        and mr.role = 'admin'
    )
  );
