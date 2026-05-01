-- Dropea los 22 índices reportados consistentemente como sin uso por advisor
-- 0005_unused_index. Decisión consciente del usuario (2026-05-01) de cerrar
-- la deuda flotante documentada en migration 20260427130000 sin esperar más
-- ventana de tráfico.
--
-- Riesgo asumido: si una query futura los necesita, el advisor los volverá a
-- pedir como `unindexed_foreign_keys` y los recreamos.
--
-- NO incluye los 18 índices recién creados en 20260501231022 (FKs que el
-- advisor pidió cubrir). Esos esperan tráfico antes de evaluar.

drop index if exists public.idx_movements_status;
drop index if exists public.idx_cost_centers_club;
drop index if exists public.idx_cost_centers_responsible;
drop index if exists public.hr_job_runs_name_started_idx;
drop index if exists public.daily_cash_session_balances_session_id_idx;
drop index if exists public.daily_cash_sessions_opened_by_user_id_idx;
drop index if exists public.payroll_payment_batches_account_id_idx;
drop index if exists public.salary_structures_club_status_idx;
drop index if exists public.club_treasury_currencies_club_id_idx;
drop index if exists public.payroll_settlements_approved_by_user_id_idx;
drop index if exists public.payroll_settlements_returned_by_user_id_idx;
drop index if exists public.fx_operations_club_id_idx;
drop index if exists public.receipt_formats_club_id_idx;
drop index if exists public.club_invitations_club_id_idx;
drop index if exists public.club_movement_type_config_club_id_idx;
drop index if exists public.account_transfers_source_account_id_idx;
drop index if exists public.account_transfers_target_account_id_idx;
drop index if exists public.balance_adjustments_account_id_idx;
drop index if exists public.balance_adjustments_movement_id_idx;
drop index if exists public.balance_adjustments_session_id_idx;
drop index if exists public.daily_cash_session_balances_account_id_idx;
drop index if exists public.salary_structures_activity_id_idx;
drop index if exists public.hr_activity_log_performed_by_user_id_idx;
drop index if exists public.payroll_settlements_annulled_by_user_id_idx;
drop index if exists public.staff_contract_attachments_uploaded_by_user_id_idx;
drop index if exists public.staff_contracts_finalized_by_user_id_idx;
drop index if exists public.user_club_preferences_last_active_club_id_idx;
drop index if exists public.memberships_approved_by_user_id_idx;
