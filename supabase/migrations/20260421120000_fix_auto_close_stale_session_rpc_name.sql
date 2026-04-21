-- El nombre original "auto_close_stale_daily_cash_session_with_balances_for_current_club"
-- tiene 66 caracteres. Postgres trunca identifiers a 63, asi que la funcion
-- quedo almacenada como "auto_close_stale_daily_cash_session_with_balances_for_current_c"
-- y PostgREST devuelve 404 cuando el cliente la llama por el nombre completo.
-- Renombramos a un identificador mas corto para que sea invocable.

alter function public.auto_close_stale_daily_cash_session_with_balances_for_current_c(
  uuid,
  date,
  uuid,
  uuid,
  jsonb,
  text
) rename to auto_close_stale_daily_cash_session_for_club;
