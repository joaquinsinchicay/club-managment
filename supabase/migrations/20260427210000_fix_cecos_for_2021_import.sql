-- Ajuste de cecos del CSV de movimientos 2021 según feedback del usuario:
--
--  1. El nuevo CSV (corregido) usa solo "Fiesta fin de año '21";
--     se eliminan los placeholders '22..'25 que se crearon en
--     20260427200000_masters_for_2021_import.sql.
--
--  2. "Hernan Perez" debe ser tipo sponsor mensual (no evento);
--     monto placeholder 1 ARS, ajustable después en la UI.
--
--  3. "Préstamo Horacio Jimenez" debe ser tipo deuda en USD;
--     monto placeholder 1500 USD, responsable = Tesorería Primera Junta.
--
-- Como los cecos no permiten editar el tipo desde la UI, se borran
-- los previos (creados como "evento") y se recrean con el tipo correcto.

WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
DELETE FROM public.cost_centers
WHERE club_id IN (SELECT id FROM club)
  AND name IN (
    'Hernan Perez',
    'Préstamo Horacio Jimenez',
    'Fiesta fin de año ''22',
    'Fiesta fin de año ''23',
    'Fiesta fin de año ''24',
    'Fiesta fin de año ''25'
  );

WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
tesoreria_user AS (
  SELECT id FROM public.users WHERE email = 'tesoreriaprimerajunta@gmail.com'
)
INSERT INTO public.cost_centers (
  club_id, name, type, status, start_date, currency_code, amount, periodicity, responsible_user_id
)
SELECT
  c.id, 'Hernan Perez', 'sponsor'::cost_center_type, 'activo'::cost_center_status,
  DATE '2021-04-14', 'ARS', 1.00, 'mensual'::cost_center_periodicity, NULL
FROM club c
UNION ALL
SELECT
  c.id, 'Préstamo Horacio Jimenez', 'deuda'::cost_center_type, 'activo'::cost_center_status,
  DATE '2021-04-14', 'USD', 1500.00, NULL, tu.id
FROM club c CROSS JOIN tesoreria_user tu;
