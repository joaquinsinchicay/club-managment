-- Masters para el import de movimientos 2023:
-- 2 cuentas nuevas (Pro-Tesoreria, Mobbex) + ARS habilitado.
-- 4 cost centers nuevos del 2023 (CC-331, CC-52, CC-339, CC-12). Tipo evento
-- (no requiere amount), status inactivo. NO se crean subcategorías legacy
-- (ya documentado en CLAUDE.md § "Convenciones del modelo").

-- 1) Cuentas nuevas
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_accounts (
  id, club_id, name, account_type, account_scope, status,
  visible_for_secretaria, visible_for_tesoreria, emoji, bank_entity, created_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), 'Pro-Tesoreria',
       'bancaria', 'tesoreria', 'activo',
       false, true, NULL, 'Galicia', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_accounts
  WHERE club_id = (SELECT id FROM ac) AND name = 'Pro-Tesoreria'
);

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_accounts (
  id, club_id, name, account_type, account_scope, status,
  visible_for_secretaria, visible_for_tesoreria, emoji, bank_entity, created_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), 'Mobbex',
       'billetera_virtual', 'tesoreria', 'activo',
       false, true, NULL, 'Mobbex', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_accounts
  WHERE club_id = (SELECT id FROM ac) AND name = 'Mobbex'
);

-- 2) Habilitar ARS en las cuentas nuevas
INSERT INTO public.treasury_account_currencies (id, account_id, currency_code, initial_balance)
SELECT gen_random_uuid(), a.id, 'ARS', 0
FROM public.treasury_accounts a
WHERE a.club_id = (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
  AND a.name IN ('Pro-Tesoreria', 'Mobbex')
  AND NOT EXISTS (
    SELECT 1 FROM public.treasury_account_currencies tc
    WHERE tc.account_id = a.id AND tc.currency_code = 'ARS'
  );

-- 3) 4 cost centers nuevos del 2023.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
new_ccs(name) AS (VALUES
  ('Presupuesto 1ra AFA 2023'),
  ('Fiesta fin de año ''23'),
  ('Atacamca 2023'),
  ('Deuda Chicho')
)
INSERT INTO public.cost_centers (
  id, club_id, name, type, status, currency_code, start_date, created_at, updated_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), n.name, 'evento'::cost_center_type, 'inactivo', 'ARS', '2023-01-01'::date, NOW(), NOW()
FROM new_ccs n
WHERE NOT EXISTS (
  SELECT 1 FROM public.cost_centers cc
  WHERE cc.club_id = (SELECT id FROM ac)
    AND lower(cc.name) = lower(n.name)
);
