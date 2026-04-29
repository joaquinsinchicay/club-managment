-- 4 contratos faltantes cubriendo 2022 para colaboradores cuyos pagos del CSV
-- no tienen contrato vigente en 2022. Usa la structure 'Pago histórico 2021'
-- como fallback genérico.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
struct AS (
  SELECT id FROM public.salary_structures
  WHERE club_id IN (SELECT id FROM ac) AND name = 'Pago histórico 2021'
  LIMIT 1
),
targets(staff_id) AS (VALUES
  ('59211897-65af-47a2-ac5b-15fb8715e55c'::uuid),
  ('58203b48-664d-4fdf-ba6b-311cf3d84ad9'::uuid),
  ('c66922a0-7d27-43e0-b0f7-1c7d70b69084'::uuid),
  ('3907ffa4-7bb2-46bd-bbc6-b9b8f9a4681f'::uuid)
)
INSERT INTO public.staff_contracts (
  id, club_id, staff_member_id, salary_structure_id,
  start_date, end_date, status, finalized_at, finalized_reason,
  created_at, updated_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), t.staff_id, (SELECT id FROM struct),
       '2022-01-01'::date, '2022-12-31'::date, 'finalizado',
       '2022-12-31 00:00:00+00', 'Carga histórica CSV 2022', NOW(), NOW()
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_contracts c
  WHERE c.staff_member_id = t.staff_id
    AND c.start_date <= '2022-06-30'::date
    AND (c.end_date IS NULL OR c.end_date >= '2022-06-30'::date)
);
