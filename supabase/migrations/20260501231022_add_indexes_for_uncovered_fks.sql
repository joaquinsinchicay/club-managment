-- Cubre los 18 FKs reportados por advisor 0001_unindexed_foreign_keys.
-- Auditoría: docs/audit/20260501_db_audit.md (sección 3 · Performance).
--
-- Crítico (1): staff_contracts.salary_structure_id es FK frecuentemente joineada
-- en el módulo RRHH; sin índice causa seq scan en listados de contratos por estructura.
--
-- Audit columns (17): created_by_user_id / updated_by_user_id en tablas con
-- volumen creciente. Bajo impacto consultivo pero costo de fix mínimo. Postgres
-- también recomienda cubrir todos los FKs para evitar locks en cascada DELETE/UPDATE
-- de la tabla referenciada.

-- HR · alto impacto en queries reales
create index if not exists staff_contracts_salary_structure_id_idx
  on public.staff_contracts (salary_structure_id);

-- HR · audit columns
create index if not exists staff_contracts_created_by_user_id_idx
  on public.staff_contracts (created_by_user_id);
create index if not exists staff_contracts_updated_by_user_id_idx
  on public.staff_contracts (updated_by_user_id);
create index if not exists staff_members_created_by_user_id_idx
  on public.staff_members (created_by_user_id);
create index if not exists staff_members_updated_by_user_id_idx
  on public.staff_members (updated_by_user_id);
create index if not exists staff_contract_revisions_created_by_user_id_idx
  on public.staff_contract_revisions (created_by_user_id);
create index if not exists salary_structures_created_by_user_id_idx
  on public.salary_structures (created_by_user_id);
create index if not exists salary_structures_updated_by_user_id_idx
  on public.salary_structures (updated_by_user_id);
create index if not exists payroll_settlements_created_by_user_id_idx
  on public.payroll_settlements (created_by_user_id);
create index if not exists payroll_settlements_updated_by_user_id_idx
  on public.payroll_settlements (updated_by_user_id);
create index if not exists payroll_settlement_adjustments_created_by_user_id_idx
  on public.payroll_settlement_adjustments (created_by_user_id);
create index if not exists payroll_payment_batches_created_by_user_id_idx
  on public.payroll_payment_batches (created_by_user_id);

-- Treasury / cost centers · audit columns
create index if not exists treasury_movements_created_by_user_id_idx
  on public.treasury_movements (created_by_user_id);
create index if not exists treasury_movement_cost_centers_created_by_user_id_idx
  on public.treasury_movement_cost_centers (created_by_user_id);
create index if not exists cost_centers_created_by_user_id_idx
  on public.cost_centers (created_by_user_id);
create index if not exists cost_centers_updated_by_user_id_idx
  on public.cost_centers (updated_by_user_id);
create index if not exists cost_center_audit_log_actor_user_id_idx
  on public.cost_center_audit_log (actor_user_id);
create index if not exists daily_cash_sessions_closed_by_user_id_idx
  on public.daily_cash_sessions (closed_by_user_id);
create index if not exists daily_consolidation_batches_executed_by_user_id_idx
  on public.daily_consolidation_batches (executed_by_user_id);
create index if not exists movement_audit_logs_performed_by_user_id_idx
  on public.movement_audit_logs (performed_by_user_id);
