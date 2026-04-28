-- Renombrar display_id de los movimientos importados desde el CSV 2022.
-- Mismo patrón que 20260427240000_renumber_imp2021_display_ids.sql.
WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
ordered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM movement_date)::int AS year,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM movement_date)
      ORDER BY (regexp_replace(external_id, '^IMP2022-', ''))::int
    ) AS seq
  FROM public.treasury_movements
  WHERE club_id IN (SELECT id FROM club)
    AND external_id LIKE 'IMP2022-%'
    AND display_id LIKE 'IMP2022-%'
)
UPDATE public.treasury_movements tm
SET display_id = 'APJ-MOV-' || ordered.year || '-' || ordered.seq
FROM ordered
WHERE tm.id = ordered.id;
