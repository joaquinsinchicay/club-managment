WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
struct AS (
  SELECT id FROM public.salary_structures
  WHERE club_id IN (SELECT id FROM ac) AND name = 'Pago histórico 2021'
  LIMIT 1
),
targets(staff_id) AS (VALUES
  ('82edb494-8fc3-4cd0-9053-11457c0f96d3'::uuid),  -- Darío GUERRERO
  ('68317116-83f2-4f42-96e3-8476fc36b32d'::uuid),  -- Manuel BLANCO
  ('0ff68f2f-6687-4c87-8041-388411f5f65e'::uuid)   -- Leandro GONZALEZ
)
INSERT INTO public.staff_contracts (
  id, club_id, staff_member_id, salary_structure_id,
  start_date, end_date, status, finalized_at, finalized_reason,
  created_at, updated_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), t.staff_id, (SELECT id FROM struct),
       '2024-01-01'::date, '2024-12-31'::date, 'finalizado',
       '2024-12-31 00:00:00+00', 'Carga histórica CSV 2024', NOW(), NOW()
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_contracts c
  WHERE c.staff_member_id = t.staff_id
    AND c.start_date <= '2024-06-30'::date
    AND (c.end_date IS NULL OR c.end_date >= '2024-06-30'::date)
);
