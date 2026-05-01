-- Endurece RLS del módulo RRHH para exigir rol `rrhh` además de `club_id`.
--
-- Estado previo: las 8 tablas HR (staff_members, staff_contracts, salary_structures,
-- staff_contract_revisions, staff_contract_attachments, payroll_settlements,
-- payroll_settlement_adjustments, payroll_payment_batches, hr_activity_log) tenían
-- policies con `qual = (club_id = current_club_id())` sin guard de rol. Resultado:
-- cualquier user autenticado del club podía leer salarios y contratos vía REST directo
-- (`/rest/v1/staff_contracts?club_id=eq.<x>`). Los guards TS protegían las páginas pero
-- no la API REST.
--
-- Path de acceso legítimo: el código accede a estas tablas vía repositorios que usan
-- `createRequiredAdminSupabaseClient()` (service_role), el cual bypassea RLS. Los mirrors
-- de Tesorería (US-67/US-68) siguen funcionando porque pasan por `getStaffProfile()`,
-- que también usa service_role.
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 4 · Crítica · "Ninguna policy del
-- módulo RRHH restringe por rol rrhh").

-- staff_members
drop policy if exists staff_members_club_scope on public.staff_members;
create policy staff_members_rrhh_scope on public.staff_members
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- staff_contracts
drop policy if exists staff_contracts_club_scope on public.staff_contracts;
create policy staff_contracts_rrhh_scope on public.staff_contracts
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- staff_contract_revisions
drop policy if exists staff_contract_revisions_club_scope on public.staff_contract_revisions;
create policy staff_contract_revisions_rrhh_scope on public.staff_contract_revisions
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- staff_contract_attachments
drop policy if exists staff_contract_attachments_club_scope on public.staff_contract_attachments;
create policy staff_contract_attachments_rrhh_scope on public.staff_contract_attachments
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- salary_structures
drop policy if exists salary_structures_club_scope on public.salary_structures;
create policy salary_structures_rrhh_scope on public.salary_structures
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- payroll_settlements
drop policy if exists payroll_settlements_club_scope on public.payroll_settlements;
create policy payroll_settlements_rrhh_scope on public.payroll_settlements
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- payroll_settlement_adjustments (no tiene club_id directo; club se infiere via settlement_id)
drop policy if exists payroll_settlement_adjustments_club_scope on public.payroll_settlement_adjustments;
create policy payroll_settlement_adjustments_rrhh_scope on public.payroll_settlement_adjustments
  for all
  using (
    (select public.current_user_has_role('rrhh'))
    and exists (
      select 1 from public.payroll_settlements ps
      where ps.id = payroll_settlement_adjustments.settlement_id
        and ps.club_id = (select public.current_club_id())
    )
  )
  with check (
    (select public.current_user_has_role('rrhh'))
    and exists (
      select 1 from public.payroll_settlements ps
      where ps.id = payroll_settlement_adjustments.settlement_id
        and ps.club_id = (select public.current_club_id())
    )
  );

-- payroll_payment_batches
drop policy if exists payroll_payment_batches_club_scope on public.payroll_payment_batches;
create policy payroll_payment_batches_rrhh_scope on public.payroll_payment_batches
  for all
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  )
  with check (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );

-- hr_activity_log (read-only desde la app, pero exige rrhh igual)
drop policy if exists hr_activity_log_club_scope on public.hr_activity_log;
create policy hr_activity_log_rrhh_scope on public.hr_activity_log
  for select
  using (
    club_id = (select public.current_club_id())
    and (select public.current_user_has_role('rrhh'))
  );
