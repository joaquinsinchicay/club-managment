-- Crear 11 contratos faltantes para el import histórico completo (2021-2026):
-- - 7 contratos 2021 (staff existente sin coverage de ese año)
-- - 3 contratos 2025 (staff existente sin coverage de ese año, ya creado en
--   fase previa que fue purgada)
-- - 1 contrato 2026 para Patricia LEIBE (staff nuevo creado en migration 010000)
-- Todos finalizado, salary_structure 'Pago histórico 2021', idempotente por
-- overlap con mid-año del contrato.

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
struct AS (
  SELECT id FROM public.salary_structures
  WHERE club_id IN (SELECT id FROM ac) AND name = 'Pago histórico 2021'
  LIMIT 1
),
targets(staff_id, period_year) AS (VALUES
  -- 2021
  ('e12a9b4f-b0ac-4ecf-843c-a29bb6bf9bdd'::uuid, 2021),  -- Franco IANNONE
  ('52357545-3eb0-4f32-8e33-d02facbb16a8'::uuid, 2021),  -- Facundo ROLDÁN
  ('337c0179-ba9a-44bf-87e9-07bf7a7b1313'::uuid, 2021),  -- Angel SEGOVIA
  ('bcc319ad-9464-470b-9c7b-630c0de499a8'::uuid, 2021),  -- Roman PUCHETA
  ('1f77db83-c2d8-4dc5-9615-1939a3792524'::uuid, 2021),  -- Gustavo CANEPA
  ('59211897-65af-47a2-ac5b-15fb8715e55c'::uuid, 2021),  -- Matias MACRI
  ('787ba93b-8d6d-4a40-bed9-084b171b7fdd'::uuid, 2021),  -- José BIANCO
  -- 2025
  ('68317116-83f2-4f42-96e3-8476fc36b32d'::uuid, 2025),  -- Manuel BLANCO
  ('7ab97bfc-2b54-426f-9ab2-b204d68d316f'::uuid, 2025),  -- Danel GONZALEZ
  ('cf869f9b-9b79-46bd-8013-6d93290b51bc'::uuid, 2025),  -- Nicolas APARICIO
  -- 2026
  ('cf65ed61-6d27-4a98-8cef-8957073f044c'::uuid, 2026)   -- Patricia LEIBE
)
INSERT INTO public.staff_contracts (
  id, club_id, staff_member_id, salary_structure_id,
  start_date, end_date, status, finalized_at, finalized_reason,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM ac),
  t.staff_id,
  (SELECT id FROM struct),
  make_date(t.period_year, 1, 1),
  make_date(t.period_year, 12, 31),
  'finalizado',
  make_timestamptz(t.period_year, 12, 31, 0, 0, 0, 'UTC'),
  'Carga histórica CSV ' || t.period_year,
  NOW(), NOW()
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_contracts c
  WHERE c.staff_member_id = t.staff_id
    AND c.start_date <= make_date(t.period_year, 6, 30)
    AND (c.end_date IS NULL OR c.end_date >= make_date(t.period_year, 6, 30))
);
