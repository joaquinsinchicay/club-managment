-- Renombrar display_id de los movimientos importados desde el CSV 2021.
--
-- Las filas insertadas por scripts/import-2021/build-sql.py usaban
-- display_id = 'IMP2021-<csv_id>' (formato ad-hoc del importador). El
-- estandar del producto es '<club_initials>-MOV-<year>-<seq>' (ver
-- generateMovementDisplayId en lib/services/treasury-service.ts:348).
--
-- Esta migracion renombra todos los IMP2021-* a APJ-MOV-2021-<seq>,
-- preservando el orden secuencial del CSV (csv_id ascendente). El
-- club activo es A.A. Primera Junta -> initials APJ.
--
-- Idempotente: el WHERE filtra solo IDs que aun tienen el prefijo legacy.

WITH club AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
ordered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM movement_date)::int AS year,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM movement_date)
      ORDER BY (regexp_replace(external_id, '^IMP2021-', ''))::int
    ) AS seq
  FROM public.treasury_movements
  WHERE club_id IN (SELECT id FROM club)
    AND external_id LIKE 'IMP2021-%'
    AND display_id LIKE 'IMP2021-%'
)
UPDATE public.treasury_movements tm
SET display_id = 'APJ-MOV-' || ordered.year || '-' || ordered.seq
FROM ordered
WHERE tm.id = ordered.id;
