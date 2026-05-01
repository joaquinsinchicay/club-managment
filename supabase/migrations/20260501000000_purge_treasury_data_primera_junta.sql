-- Purga total de datos transaccionales del club A.A. Primera Junta.
-- Borra: treasury_movements (17.144), account_transfers (385), fx_operations (38),
-- payroll_settlements (1.101), daily_cash_sessions (9) + dependencias.
-- Preserva: maestros (accounts, categories, cost_centers, activities, staff, contracts, etc.)
--           y hr_activity_log (append-only).
-- Backup previo: /tmp/backup-pre-purge-* (JSON por tabla).

BEGIN;

-- club objetivo: A.A. Primera Junta
-- be7b2a37-fcb8-46fe-961c-0ba190bcda7e

-- 1. Liberar FKs bidireccionales payroll ↔ movements antes de borrar
UPDATE public.payroll_settlements
SET paid_movement_id = NULL
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

UPDATE public.treasury_movements
SET payroll_settlement_id = NULL
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e' AND payroll_settlement_id IS NOT NULL;

UPDATE public.treasury_movements
SET payroll_payment_batch_id = NULL
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e' AND payroll_payment_batch_id IS NOT NULL;

-- 2. Borrar payroll_settlements (CASCADE limpia payroll_settlement_adjustments)
DELETE FROM public.payroll_settlements
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

-- 3. Borrar payroll_payment_batches del club
DELETE FROM public.payroll_payment_batches
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

-- 4. Borrar dependencias de movements antes de los movements
DELETE FROM public.movement_integrations
WHERE secretaria_movement_id IN (
        SELECT id FROM public.treasury_movements
        WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
      )
   OR tesoreria_movement_id IN (
        SELECT id FROM public.treasury_movements
        WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
      );

DELETE FROM public.movement_audit_logs
WHERE movement_id IN (
  SELECT id FROM public.treasury_movements
  WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
);

DELETE FROM public.balance_adjustments
WHERE movement_id IN (
        SELECT id FROM public.treasury_movements
        WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
      )
   OR session_id IN (
        SELECT id FROM public.daily_cash_sessions
        WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
      );

-- 5. Borrar transferencias y operaciones de cambio (no hay FK enforced desde movements)
DELETE FROM public.account_transfers
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

DELETE FROM public.fx_operations
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

-- 6. Borrar treasury_movements (CASCADE auto-limpia treasury_movement_cost_centers)
DELETE FROM public.treasury_movements
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

-- 7. Limpiar daily_cash_session_balances + sesiones
DELETE FROM public.daily_cash_session_balances
WHERE session_id IN (
  SELECT id FROM public.daily_cash_sessions
  WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e'
);

DELETE FROM public.daily_cash_sessions
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

-- 8. Consolidation batches
DELETE FROM public.daily_consolidation_batches
WHERE club_id = 'be7b2a37-fcb8-46fe-961c-0ba190bcda7e';

COMMIT;
