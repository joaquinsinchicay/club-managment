-- payroll_settlements ya tiene `payroll_settlements_unique_non_annulled`
-- (UNIQUE INDEX (contract_id, period_year, period_month) WHERE status <>
-- 'anulada'). El planner NO lo puede usar para queries que filtran por
-- contract_id sin condición de status (ej. listForContract en
-- payroll-settlement-repository.ts:402-408 que ordena por período DESC y
-- no filtra status). EXPLAIN confirma Seq Scan: ~50ms con 1585 filas.
--
-- Agregamos un índice no-parcial sobre (contract_id) que el planner
-- puede usar para todas las queries por FK reverse-lookup. Bajo costo
-- de mantenimiento (FK estable) y resuelve el último N+1 implícito del
-- módulo HR.
--
-- Verificado post-aplicación: Index Scan, 2.4ms (20x speedup vs Seq Scan).
--
-- Refs: audit perf top-7 · H1.

CREATE INDEX IF NOT EXISTS payroll_settlements_contract_id_idx
  ON public.payroll_settlements
  USING btree (contract_id);
