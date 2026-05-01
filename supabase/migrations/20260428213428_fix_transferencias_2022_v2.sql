WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
legacy_cats AS (
  SELECT id, movement_type FROM public.treasury_categories
  WHERE club_id IN (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) IN ('egreso e/cuentas','ingreso e/cuentas')
),
egresos AS (
  SELECT m.id, m.movement_date, m.amount, m.currency_code, m.account_id, m.concept, m.club_id,
         ROW_NUMBER() OVER (
           PARTITION BY m.movement_date, m.amount, m.currency_code, m.account_id
           ORDER BY m.id
         ) AS rn_within_group
  FROM public.treasury_movements m
  JOIN legacy_cats c ON c.id = m.category_id AND c.movement_type = 'egreso'
),
ingresos AS (
  SELECT m.id, m.movement_date, m.amount, m.currency_code, m.account_id, m.concept,
         ROW_NUMBER() OVER (
           PARTITION BY m.movement_date, m.amount, m.currency_code, m.account_id
           ORDER BY m.id
         ) AS rn_within_group
  FROM public.treasury_movements m
  JOIN legacy_cats c ON c.id = m.category_id AND c.movement_type = 'ingreso'
),
-- Match 1-a-1 estricto: cada egreso se asocia con UN solo ingreso por
-- (date, amount, currency, source_account, target_account, rank).
pairs AS (
  SELECT
    e.id AS egreso_id, i.id AS ingreso_id,
    e.club_id, e.account_id AS source_account_id, i.account_id AS target_account_id,
    e.currency_code, e.amount, e.concept, e.movement_date,
    gen_random_uuid() AS new_transfer_id
  FROM egresos e
  JOIN ingresos i
    ON i.movement_date = e.movement_date
   AND i.amount = e.amount
   AND i.currency_code = e.currency_code
   AND i.account_id <> e.account_id
   AND i.rn_within_group = e.rn_within_group  -- empareja por orden si hay duplicados
),
inserted AS (
  INSERT INTO public.account_transfers (
    id, club_id, source_account_id, target_account_id,
    currency_code, amount, concept, created_at
  )
  SELECT new_transfer_id, club_id, source_account_id, target_account_id,
         currency_code, amount, concept,
         (movement_date::timestamp + time '12:00:00')
  FROM pairs
  RETURNING id
)
UPDATE public.treasury_movements tm
SET transfer_group_id = p.new_transfer_id,
    category_id = NULL
FROM pairs p
WHERE tm.id IN (p.egreso_id, p.ingreso_id);
