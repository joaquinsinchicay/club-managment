-- Eliminar las 2 subcategorías fantasma "Egreso e/cuentas" / "Ingreso e/cuentas"
-- creadas erróneamente durante el import 2022 (migración 20260428200000).
-- Esas subcats no existen en el modelo actual (eliminadas en commit 2a0f53c
-- como parte del rediseño de Categorías 2026-04-27).
--
-- Pre-condición: ningún movimiento debe apuntar a ellas (asegurado por
-- 20260428250000_fix_transferencias_2022_a_account_transfers.sql).
-- El NOT EXISTS protege contra borrado parcial: si por algún motivo queda
-- un mov huérfano, la subcat sobrevive y la verificación post-aplicación
-- lo detecta.

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
to_drop AS (
  SELECT id FROM public.treasury_categories
  WHERE club_id IN (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) IN ('egreso e/cuentas','ingreso e/cuentas')
    AND is_legacy = true
)
DELETE FROM public.treasury_categories
WHERE id IN (SELECT id FROM to_drop)
  AND NOT EXISTS (
    SELECT 1 FROM public.treasury_movements m
    WHERE m.category_id IN (SELECT id FROM to_drop)
  );
