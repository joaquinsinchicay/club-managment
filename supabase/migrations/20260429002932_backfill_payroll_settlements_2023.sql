-- Backfill payroll_settlements 2023. Mismo patrón que 2021/2022.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
mov_groups AS (
  SELECT
    staff_contract_id AS contract_id,
    EXTRACT(YEAR  FROM movement_date)::int AS period_year,
    EXTRACT(MONTH FROM movement_date)::int AS period_month,
    SUM(amount)::numeric(18,2) AS total_amount,
    (ARRAY_AGG(id ORDER BY (regexp_replace(external_id, '^IMP2023-', ''))::int))[1]
      AS principal_movement_id,
    COUNT(*) AS movs_count
  FROM public.treasury_movements
  WHERE club_id IN (SELECT id FROM ac)
    AND staff_contract_id IS NOT NULL
    AND payroll_settlement_id IS NULL
    AND external_id LIKE 'IMP2023-%'
  GROUP BY staff_contract_id,
           EXTRACT(YEAR  FROM movement_date),
           EXTRACT(MONTH FROM movement_date)
),
inserted AS (
  INSERT INTO public.payroll_settlements (
    club_id, contract_id, period_year, period_month,
    base_amount, adjustments_total, total_amount,
    requires_hours_input, status,
    approved_at, approved_by_user_id,
    paid_at, paid_movement_id,
    notes,
    created_at, updated_at
  )
  SELECT
    (SELECT id FROM ac), mg.contract_id, mg.period_year, mg.period_month,
    mg.total_amount, 0, mg.total_amount,
    false, 'pagada'::payroll_settlement_status,
    make_timestamptz(mg.period_year, mg.period_month, 1, 0, 0, 0, 'UTC'),
    NULL,
    make_timestamptz(mg.period_year, mg.period_month, 1, 0, 0, 0, 'UTC'),
    mg.principal_movement_id,
    CASE WHEN mg.movs_count > 1
         THEN 'Carga historica CSV 2023 - agrupa ' || mg.movs_count || ' pagos parciales del mes.'
         ELSE 'Carga historica CSV 2023.'
    END,
    NOW(), NOW()
  FROM mov_groups mg
  RETURNING id, contract_id, period_year, period_month, paid_movement_id
),
linked AS (
  UPDATE public.treasury_movements tm
  SET payroll_settlement_id = i.id
  FROM inserted i
  WHERE tm.id = i.paid_movement_id
  RETURNING tm.id
)
INSERT INTO public.hr_activity_log (
  club_id, entity_type, entity_id, action,
  payload_after, performed_by_user_id, performed_at
)
SELECT
  (SELECT id FROM ac),
  'payroll_settlement', i.id, 'BACKFILL_HISTORIC_2023',
  jsonb_build_object(
    'period', i.period_year || '-' || lpad(i.period_month::text, 2, '0'),
    'paid_movement_id', i.paid_movement_id,
    'source', 'csv_import_2023'
  ),
  NULL, NOW()
FROM inserted i;
