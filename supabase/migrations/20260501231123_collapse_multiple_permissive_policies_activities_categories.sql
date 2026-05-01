-- Resuelve advisor 0006_multiple_permissive_policies en club_activities y
-- treasury_categories: para SELECT por authenticated existían 2 policies
-- permissive (admin via ALL + member via SELECT) que postgres evaluaba en
-- secuencia.
--
-- Solución: dejar "Members can view" como única policy SELECT (admins son
-- members, así que también pasan) y restringir la "Admins manage" a las 3
-- operaciones de mutación (INSERT/UPDATE/DELETE).
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 4 · Media).

-- club_activities
drop policy if exists "Admins manage activities in current club" on public.club_activities;

create policy "Admins insert activities in current club" on public.club_activities
  for insert to authenticated
  with check (club_id = (select public.current_club_id())
              and (select public.current_user_has_role('admin')));

create policy "Admins update activities in current club" on public.club_activities
  for update to authenticated
  using (club_id = (select public.current_club_id())
         and (select public.current_user_has_role('admin')))
  with check (club_id = (select public.current_club_id())
              and (select public.current_user_has_role('admin')));

create policy "Admins delete activities in current club" on public.club_activities
  for delete to authenticated
  using (club_id = (select public.current_club_id())
         and (select public.current_user_has_role('admin')));

-- treasury_categories
drop policy if exists "Admins manage categories in current club" on public.treasury_categories;

create policy "Admins insert categories in current club" on public.treasury_categories
  for insert to authenticated
  with check (club_id = (select public.current_club_id())
              and (select public.current_user_has_role('admin')));

create policy "Admins update categories in current club" on public.treasury_categories
  for update to authenticated
  using (club_id = (select public.current_club_id())
         and (select public.current_user_has_role('admin')))
  with check (club_id = (select public.current_club_id())
              and (select public.current_user_has_role('admin')));

create policy "Admins delete categories in current club" on public.treasury_categories
  for delete to authenticated
  using (club_id = (select public.current_club_id())
         and (select public.current_user_has_role('admin')));
