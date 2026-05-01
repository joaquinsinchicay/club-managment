-- Dropea 8 RPCs SECURITY DEFINER sin uso desde código TS (validado por
-- grep en lib/, app/, components/). Excluye hr_recalc_settlement_totals
-- porque es función de trigger (usada implícitamente por
-- payroll_settlement_adjustments_recalc).
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 2 · Baja). Decisión
-- consciente del usuario el 2026-05-01.

drop function if exists public.count_treasury_movements_by_year_for_current_club(uuid, text);
drop function if exists public.create_daily_consolidation_batch_for_current_club(uuid, date, consolidation_status, uuid);
drop function if exists public.update_daily_consolidation_batch_for_current_club(uuid, uuid, consolidation_status, text);
drop function if exists public.get_daily_consolidation_batch_by_date_for_current_club(uuid, date);
drop function if exists public.get_movement_audit_logs_by_movement_id_for_current_club(uuid, uuid);
drop function if exists public.record_balance_adjustment_for_current_club(uuid, uuid, uuid, uuid, numeric, balance_moment);
drop function if exists public.record_daily_cash_session_balances_for_current_club(uuid, jsonb);
drop function if exists public.auto_close_stale_daily_cash_session_for_club(uuid, date, uuid, uuid, jsonb, text);
