-- Performance advisor 0003 (auth_rls_initplan): re-evaluacion de
-- current_setting()/auth.uid() por fila. Fix: envolver en (select ...)
-- para que postgres lo cachee por query (initplan).
--
-- Aplicado a las 9 tablas RRHH + clubs.

-- ----- HR tables -----
drop policy if exists salary_structures_club_scope on public.salary_structures;
create policy salary_structures_club_scope on public.salary_structures
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists staff_members_club_scope on public.staff_members;
create policy staff_members_club_scope on public.staff_members
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists staff_contracts_club_scope on public.staff_contracts;
create policy staff_contracts_club_scope on public.staff_contracts
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists staff_contract_revisions_club_scope on public.staff_contract_revisions;
create policy staff_contract_revisions_club_scope on public.staff_contract_revisions
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists staff_contract_attachments_club_scope on public.staff_contract_attachments;
create policy staff_contract_attachments_club_scope on public.staff_contract_attachments
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists payroll_settlements_club_scope on public.payroll_settlements;
create policy payroll_settlements_club_scope on public.payroll_settlements
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments;
create policy payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments
  as permissive for all to authenticated
  using (exists (
    select 1 from public.payroll_settlements ps
    where ps.id = payroll_settlement_adjustments.settlement_id
      and ps.club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid)
  ))
  with check (exists (
    select 1 from public.payroll_settlements ps
    where ps.id = payroll_settlement_adjustments.settlement_id
      and ps.club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid)
  ));

drop policy if exists payroll_payment_batches_club_scope on public.payroll_payment_batches;
create policy payroll_payment_batches_club_scope on public.payroll_payment_batches
  as permissive for all to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid))
  with check (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

drop policy if exists hr_activity_log_club_scope on public.hr_activity_log;
create policy hr_activity_log_club_scope on public.hr_activity_log
  as permissive for select to authenticated
  using (club_id = (select nullif(current_setting('app.current_club_id', true), '')::uuid));

-- ----- clubs admin update -----
drop policy if exists "Admins can update their club identity" on public.clubs;
create policy "Admins can update their club identity" on public.clubs
  as permissive for update to authenticated
  using (exists (
    select 1
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    where m.user_id = (select auth.uid())
      and m.club_id = clubs.id
      and m.status = 'activo'::membership_status
      and mr.role = 'admin'::membership_role
  ));
