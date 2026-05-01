WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
ceco_data(name, type, currency_code, start_date) AS (VALUES
  ('Hernan Perez',                  'evento'::cost_center_type, 'ARS', DATE '2021-04-14'),
  ('Préstamo Horacio Jimenez',      'evento'::cost_center_type, 'ARS', DATE '2021-04-14'),
  ('Fiesta fin de año ''21',        'evento'::cost_center_type, 'ARS', DATE '2021-12-01'),
  ('Fiesta fin de año ''22',        'evento'::cost_center_type, 'ARS', DATE '2022-12-01'),
  ('Fiesta fin de año ''23',        'evento'::cost_center_type, 'ARS', DATE '2023-12-01'),
  ('Fiesta fin de año ''24',        'evento'::cost_center_type, 'ARS', DATE '2024-12-01'),
  ('Fiesta fin de año ''25',        'evento'::cost_center_type, 'ARS', DATE '2025-12-01')
)
INSERT INTO public.cost_centers (club_id, name, type, status, start_date, currency_code, amount)
SELECT c.id, cd.name, cd.type, 'activo'::cost_center_status, cd.start_date, cd.currency_code, NULL
FROM ceco_data cd CROSS JOIN club c;
