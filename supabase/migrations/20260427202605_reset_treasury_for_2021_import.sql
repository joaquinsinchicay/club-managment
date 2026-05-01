-- Reset de datos operativos de Tesorería del club activo para preparar la
-- importación masiva de movimientos históricos 2021 (CSV de Joaquín).
--
-- Borra: movimientos, transferencias, operaciones FX, sesiones diarias,
-- consolidaciones, cecos (excepto "1ra AFA"), y todas las dependencias
-- (audit logs, balance adjustments, integraciones, links a cecos).
--
-- NO toca: clubs, users, memberships, treasury_accounts, treasury_categories,
-- club_activities, club_calendar_events, ni nada de RRHH (staff_members,
-- staff_contracts, salary_structures, payroll_settlements, etc.).

WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
movs AS (
  SELECT id FROM public.treasury_movements WHERE club_id IN (SELECT id FROM club)
),
sessions AS (
  SELECT id FROM public.daily_cash_sessions WHERE club_id IN (SELECT id FROM club)
),
del_balance_adj AS (
  DELETE FROM public.balance_adjustments
  WHERE session_id IN (SELECT id FROM sessions)
     OR movement_id IN (SELECT id FROM movs)
  RETURNING 1
),
del_session_balances AS (
  DELETE FROM public.daily_cash_session_balances
  WHERE session_id IN (SELECT id FROM sessions)
  RETURNING 1
),
del_audit_logs AS (
  DELETE FROM public.movement_audit_logs
  WHERE movement_id IN (SELECT id FROM movs)
  RETURNING 1
),
del_integrations AS (
  DELETE FROM public.movement_integrations
  WHERE secretaria_movement_id IN (SELECT id FROM movs)
     OR tesoreria_movement_id  IN (SELECT id FROM movs)
  RETURNING 1
),
del_movs AS (
  DELETE FROM public.treasury_movements
  WHERE id IN (SELECT id FROM movs)
  RETURNING 1
),
del_transfers AS (
  DELETE FROM public.account_transfers
  WHERE club_id IN (SELECT id FROM club)
  RETURNING 1
),
del_fx AS (
  DELETE FROM public.fx_operations
  WHERE club_id IN (SELECT id FROM club)
  RETURNING 1
),
del_consolidations AS (
  DELETE FROM public.daily_consolidation_batches
  WHERE club_id IN (SELECT id FROM club)
  RETURNING 1
),
del_sessions AS (
  DELETE FROM public.daily_cash_sessions
  WHERE id IN (SELECT id FROM sessions)
  RETURNING 1
)
DELETE FROM public.cost_centers
WHERE club_id IN (SELECT id FROM club)
  AND name <> '1ra AFA';
