-- Masters faltantes para la importación masiva del CSV de Movimientos 2021.
-- Crea 2 cuentas, 7 cecos, y agrega 2 columnas (external_id + staff_contract_id)
-- en treasury_movements para soportar idempotencia y trackeo a contratos.

-- =========================================
-- 1) Cuentas faltantes (Tarjeta Clubes en Obra, Presidencia)
-- =========================================
WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_accounts (
  club_id, name, account_type, account_scope, status,
  visible_for_secretaria, visible_for_tesoreria
)
SELECT id, 'Tarjeta Clubes en Obra', 'bancaria'::account_type, 'tesoreria'::account_scope,
       'activa', false, true FROM club
UNION ALL
SELECT id, 'Presidencia', 'efectivo'::account_type, 'secretaria'::account_scope,
       'activa', true, true FROM club;

-- =========================================
-- 2) Cecos faltantes (CC-7, CC-14, CC-50..54)
--    Todos como tipo "evento" para no requerir monto
--    (constraint cost_centers_amount_required_by_type).
--    El usuario puede ajustar tipo + monto en la UI después.
-- =========================================
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

-- =========================================
-- 3) Columnas en treasury_movements para soportar import + trackeo
-- =========================================
ALTER TABLE public.treasury_movements
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS staff_contract_id uuid REFERENCES public.staff_contracts(id);

-- Idempotencia del import: cada row del CSV mapea a 1 movimiento por club.
CREATE UNIQUE INDEX IF NOT EXISTS treasury_movements_unique_external_per_club
  ON public.treasury_movements (club_id, external_id)
  WHERE external_id IS NOT NULL;

-- FK index para reportes "todos los pagos del contrato X".
CREATE INDEX IF NOT EXISTS treasury_movements_staff_contract_id_idx
  ON public.treasury_movements (staff_contract_id)
  WHERE staff_contract_id IS NOT NULL;
