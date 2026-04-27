-- Seed de treasury_account_currencies faltantes para las 2 cuentas creadas
-- en 20260427200000_masters_for_2021_import.sql.
--
-- Sin esta fila, account.currencies = [] y buildAccountBalances retorna
-- vacío, lo que hace que la UI muestre $0,00 en saldo (issue reportado por
-- el usuario al ver Presidencia y Tarjeta Clubes en Obra con saldo 0
-- cuando deberían mostrar 139.460,14 y 280.935,71 respectivamente).
--
-- Idempotente: WHERE NOT EXISTS evita duplicar.

INSERT INTO public.treasury_account_currencies (account_id, currency_code, initial_balance)
SELECT ta.id, 'ARS', 0
FROM public.treasury_accounts ta
WHERE ta.club_id = (SELECT id FROM public.clubs ORDER BY created_at LIMIT 1)
  AND ta.name IN ('Presidencia', 'Tarjeta Clubes en Obra')
  AND NOT EXISTS (
    SELECT 1 FROM public.treasury_account_currencies tac
    WHERE tac.account_id = ta.id AND tac.currency_code = 'ARS'
  );
