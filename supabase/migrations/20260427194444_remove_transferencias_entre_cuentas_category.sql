-- Quitar la categoría sistema "Transferencias e/cuentas" y subcategorías
-- "Egreso e/cuentas" / "Ingreso e/cuentas". Eran redundantes: la feature real
-- de transferencia entre cuentas (US-25) crea movimientos con category_id NULL
-- y los identifica por transfer_group_id, así que estas entradas en
-- treasury_categories sólo generaban ruido en dropdowns y reportes.
--
-- Salvaguarda crítica: AND transfer_group_id IS NULL en el delete de
-- treasury_movements garantiza que NUNCA se borre un movimiento espejo de la
-- feature de transferencia, aunque por diseño esos tienen category_id NULL.

-- 1) IDs de categorías a borrar
WITH target_categories AS (
  SELECT id
  FROM public.treasury_categories
  WHERE parent_category = 'Transferencias e/cuentas'
     OR sub_category_name IN ('Egreso e/cuentas', 'Ingreso e/cuentas')
),
-- 2) IDs de movimientos a borrar (sólo los manualmente categorizados;
--    nunca los movimientos de la feature transferencia)
target_movements AS (
  SELECT m.id
  FROM public.treasury_movements m
  WHERE m.category_id IN (SELECT id FROM target_categories)
    AND m.transfer_group_id IS NULL
),
-- 3) Limpiar dependencias sin ON DELETE CASCADE
del_balance_adj AS (
  DELETE FROM public.balance_adjustments
  WHERE movement_id IN (SELECT id FROM target_movements)
  RETURNING 1
),
del_movement_integrations AS (
  DELETE FROM public.movement_integrations
  WHERE secretaria_movement_id IN (SELECT id FROM target_movements)
     OR tesoreria_movement_id IN (SELECT id FROM target_movements)
  RETURNING 1
),
del_movement_audit_logs AS (
  DELETE FROM public.movement_audit_logs
  WHERE movement_id IN (SELECT id FROM target_movements)
  RETURNING 1
),
-- 4) Borrar movimientos (treasury_movement_cost_centers cae por ON DELETE CASCADE)
del_movements AS (
  DELETE FROM public.treasury_movements
  WHERE id IN (SELECT id FROM target_movements)
  RETURNING 1
)
-- 5) Borrar las categorías
DELETE FROM public.treasury_categories
WHERE id IN (SELECT id FROM target_categories);
