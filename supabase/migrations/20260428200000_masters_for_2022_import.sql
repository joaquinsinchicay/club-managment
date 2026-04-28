-- Masters para el import de movimientos 2022 (CSV histórico).
-- Crea: 2 cuentas (MP Tesoreria, FCI), 2 subcategorías legacy (Egreso/Ingreso e/cuentas),
-- 8 cost centers nuevos del 2022 (CC-330, CC-51, CC-9, CC-336, CC-338, CC-11, CC-10, CC-337),
-- y currency rows ARS para las cuentas nuevas.
-- Idempotente con WHERE NOT EXISTS — re-correr es no-op.

-- 1) Cuentas faltantes
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_accounts (
  id, club_id, name, account_type, account_scope, status,
  visible_for_secretaria, visible_for_tesoreria, emoji, bank_entity, created_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), 'MP Tesoreria',
       'billetera_virtual', 'tesoreria', 'activo',
       false, true, NULL, 'Mercado Pago', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_accounts
  WHERE club_id = (SELECT id FROM ac) AND name = 'MP Tesoreria'
);

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_accounts (
  id, club_id, name, account_type, account_scope, status,
  visible_for_secretaria, visible_for_tesoreria, emoji, bank_entity, created_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), 'FCI',
       'bancaria', 'tesoreria', 'activo',
       false, true, NULL, 'Galicia', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_accounts
  WHERE club_id = (SELECT id FROM ac) AND name = 'FCI'
);

-- 2) Habilitar ARS en las cuentas nuevas
INSERT INTO public.treasury_account_currencies (id, account_id, currency_code, initial_balance)
SELECT gen_random_uuid(), a.id, 'ARS', 0
FROM public.treasury_accounts a
JOIN public.clubs c ON c.id = a.club_id
WHERE c.id = (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
  AND a.name IN ('MP Tesoreria', 'FCI')
  AND NOT EXISTS (
    SELECT 1 FROM public.treasury_account_currencies tc
    WHERE tc.account_id = a.id AND tc.currency_code = 'ARS'
  );

-- 3) Re-crear subcategorías legacy "Egreso e/cuentas" / "Ingreso e/cuentas"
-- Eliminadas en commit 2a0f53c (refactor categorías 2026-04-27). Necesarias para
-- el import histórico — quedan invisibles en la UI (visible_for_*=false).
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_categories (
  id, club_id, name, sub_category_name, parent_category, movement_type,
  status, visible_for_secretaria, visible_for_tesoreria, is_system, is_legacy
)
SELECT gen_random_uuid(), (SELECT id FROM ac),
       'Egreso e/cuentas', 'Egreso e/cuentas', 'Transferencias e/cuentas',
       'egreso', 'inactivo', false, false, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_categories
  WHERE club_id = (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) = 'egreso e/cuentas'
);

WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
INSERT INTO public.treasury_categories (
  id, club_id, name, sub_category_name, parent_category, movement_type,
  status, visible_for_secretaria, visible_for_tesoreria, is_system, is_legacy
)
SELECT gen_random_uuid(), (SELECT id FROM ac),
       'Ingreso e/cuentas', 'Ingreso e/cuentas', 'Transferencias e/cuentas',
       'ingreso', 'inactivo', false, false, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.treasury_categories
  WHERE club_id = (SELECT id FROM ac)
    AND lower(coalesce(sub_category_name, name)) = 'ingreso e/cuentas'
);

-- 4) 8 cost centers nuevos del 2022. Tipo elegido por contexto del nombre.
-- Status='inactivo' por default — son históricos; el usuario los activa si los
-- quiere reusar a futuro.
WITH ac AS (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1),
new_ccs(name, type, currency_code) AS (VALUES
  ('Presupuesto 1ra AFA 2022', 'presupuesto', 'ARS'),
  ('Fiesta fin de año ''22',   'evento',      'ARS'),
  ('Break 2022',               'sponsor',     'ARS'),
  ('Atacamca 2022',            'sponsor',     'ARS'),
  ('Hernan Perez 2022',        'sponsor',     'ARS'),
  ('Full express',             'sponsor',     'ARS'),
  ('Winoil',                   'sponsor',     'ARS'),
  ('Fondo de Sponsors',        'presupuesto', 'ARS')
)
INSERT INTO public.cost_centers (
  id, club_id, name, type, status, currency_code, created_at, updated_at
)
SELECT gen_random_uuid(), (SELECT id FROM ac), n.name, n.type, 'inactivo', n.currency_code, NOW(), NOW()
FROM new_ccs n
WHERE NOT EXISTS (
  SELECT 1 FROM public.cost_centers cc
  WHERE cc.club_id = (SELECT id FROM ac)
    AND lower(cc.name) = lower(n.name)
);
