-- Seed de contratos históricos 2021 para staff_members que tenían pagos
-- en el CSV de movimientos pero no tenían contrato cubriendo el período.
--
-- Crea 1 salary_structure dummy "Pago histórico 2021" (status=inactiva
-- para no aparecer en selectores activos) y 3 staff_contracts finalizados
-- vinculados a esa estructura para:
--   · MARGELI Felipe       (10 pagos en CSV, contrato real arranca 2022-07)
--   · CARRACEDO Tomás      (10 pagos en CSV, contrato real arranca 2024-02)
--   · LAS HERAS Juan Manuel (11 pagos en CSV, sin contratos previos)
--
-- Idempotente: lookups por nombre + check de existencia previa (NOT EXISTS).

-- 1) Salary structure "Pago histórico 2021"
WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.salary_structures (
  club_id, name, functional_role, activity_id, divisions,
  remuneration_type, payment_type, status
)
SELECT id, 'Pago histórico 2021', 'Histórico', NULL, ARRAY[]::text[],
       'mensual_fijo'::salary_remuneration_type,
       'sueldo'::salary_payment_type,
       'inactiva'::salary_structure_status
FROM club
WHERE NOT EXISTS (
  SELECT 1 FROM public.salary_structures
  WHERE club_id = (SELECT id FROM club) AND name = 'Pago histórico 2021'
);

-- 2) 3 contratos finalizados linkeados a esa estructura
WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
struct AS (
  SELECT id FROM public.salary_structures
  WHERE club_id = (SELECT id FROM club) AND name = 'Pago histórico 2021'
),
targets(last_name, first_name) AS (VALUES
  ('MARGELI',   'Felipe'),
  ('CARRACEDO', 'Tomás'),
  ('LAS HERAS', 'Juan Manuel')
)
INSERT INTO public.staff_contracts (
  club_id, staff_member_id, salary_structure_id,
  start_date, end_date, status,
  finalized_at, finalized_reason
)
SELECT
  (SELECT id FROM club), sm.id, (SELECT id FROM struct),
  '2021-04-14'::date, '2021-12-31'::date,
  'finalizado'::staff_contract_status,
  '2021-12-31 23:59:59'::timestamptz,
  'Carga histórica desde Movimientos 2021 (sin estructura formal asociada)'
FROM targets t
JOIN public.staff_members sm
  ON sm.last_name = t.last_name AND sm.first_name = t.first_name
  AND sm.club_id = (SELECT id FROM club)
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_contracts sc
  WHERE sc.staff_member_id = sm.id
    AND sc.salary_structure_id = (SELECT id FROM struct)
    AND sc.start_date = '2021-04-14'
);
