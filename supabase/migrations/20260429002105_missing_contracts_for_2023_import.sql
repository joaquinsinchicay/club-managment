-- Contratos faltantes cubriendo 2023 para 3 staff cuyos pagos del CSV no
-- tienen contrato vigente en 2023. Mismo pattern que el de 2022:
-- structure 'Pago histórico 2021' (genérica), status 'finalizado',
-- start 2023-01-01 → end 2023-12-31.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
struct AS (
  SELECT id FROM public.salary_structures
  WHERE club_id IN (SELECT id FROM ac) AND name = 'Pago histórico 2021'
  LIMIT 1
),
targets(staff_id) AS (VALUES
  ('59211897-65af-47a2-ac5b-15fb8715e55c'::uuid), -- Matias MACRI
  ('e002c411-9b45-421e-bc92-5b5bef218223'::uuid), -- Brian INSFRAN
  ('a850f0d1-fdae-4ddc-b3ba-091b2ec7a6bf'::uuid)  -- Martin AMAS
)
INSERT INTO public.staff_contracts (
  id, club_id, staff_member_id, salary_structure_id,
  start_date, end_date, status, finalized_at, finalized_reason,
  created_at, updated_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), t.staff_id, (SELECT id FROM struct),
       '2023-01-01'::date, '2023-12-31'::date, 'finalizado',
       '2023-12-31 00:00:00+00', 'Carga histórica CSV 2023', NOW(), NOW()
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_contracts c
  WHERE c.staff_member_id = t.staff_id
    AND c.start_date <= '2023-06-30'::date
    AND (c.end_date IS NULL OR c.end_date >= '2023-06-30'::date)
);
