-- Crear staff_member faltante: Patricia LEIBE (CTR 140: EMP-2026-126)
-- Edith JONDOE NO se crea — ya existe en DB (staff_id=4f10c171-...).
-- El parser hará match vía fallback por first_name cuando regex devuelva
-- last_name='' y first_name='Edith'.

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.staff_members (
  id, club_id, first_name, last_name, dni, vinculo_type, hire_date, created_at, updated_at
)
VALUES (
  gen_random_uuid(), (SELECT id FROM ac),
  'Patricia', 'LEIBE', 'PEND-126', 'contrato_locacion', '2026-01-01'::date,
  NOW(), NOW()
)
ON CONFLICT DO NOTHING;
