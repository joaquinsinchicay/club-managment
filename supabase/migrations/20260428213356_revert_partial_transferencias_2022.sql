-- Revertir cambios de la primera aplicación: restablecer category_id usando heurística
-- por movement_type + buscar la subcat legacy correspondiente.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
legacy_egreso AS (
  SELECT id FROM public.treasury_categories
  WHERE club_id IN (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) = 'egreso e/cuentas'
  LIMIT 1
),
legacy_ingreso AS (
  SELECT id FROM public.treasury_categories
  WHERE club_id IN (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) = 'ingreso e/cuentas'
  LIMIT 1
)
UPDATE public.treasury_movements tm
SET category_id = CASE
                    WHEN tm.movement_type = 'egreso' THEN (SELECT id FROM legacy_egreso)
                    WHEN tm.movement_type = 'ingreso' THEN (SELECT id FROM legacy_ingreso)
                  END,
    transfer_group_id = NULL
WHERE tm.club_id IN (SELECT id FROM ac)
  AND EXTRACT(YEAR FROM tm.movement_date) = 2022
  AND tm.transfer_group_id IN (
    SELECT id FROM public.account_transfers
    WHERE club_id IN (SELECT id FROM ac)
  );

-- Limpiar las account_transfers que SOLO tienen hijos del 2022 (no las del 2021)
DELETE FROM public.account_transfers
WHERE club_id IN (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
  AND id NOT IN (
    SELECT DISTINCT transfer_group_id FROM public.treasury_movements
    WHERE transfer_group_id IS NOT NULL
  );
