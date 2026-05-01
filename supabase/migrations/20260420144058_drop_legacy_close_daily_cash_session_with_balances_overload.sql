-- Drop legacy overload sin p_notes ni close_type en el returns. Quedo colgada
-- del migration original 20260409183000 porque el replace posterior agrego
-- p_notes, pero Postgres trato al nuevo como overload paralelo en vez de
-- reemplazo. La version vigente es la que acepta p_notes.
drop function if exists public.close_daily_cash_session_with_balances_for_current_club(uuid, uuid, uuid, jsonb, jsonb);
