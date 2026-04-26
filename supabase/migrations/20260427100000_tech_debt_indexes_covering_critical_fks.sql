-- Performance advisor 0001 (unindexed_foreign_keys): cubrir los FKs
-- mas criticos (ON DELETE CASCADE + joins frecuentes). Skip los
-- *_created_by_user_id / *_updated_by_user_id salvo en RRHH operacional
-- por bajo impacto y costo de write amplification.

-- ----- club_id (CASCADE + scope queries) -----
create index if not exists account_transfers_club_id_idx
  on public.account_transfers (club_id);
create index if not exists club_activities_club_id_idx
  on public.club_activities (club_id);
create index if not exists club_calendar_events_club_id_idx
  on public.club_calendar_events (club_id);
create index if not exists club_invitations_club_id_idx
  on public.club_invitations (club_id);
create index if not exists club_movement_type_config_club_id_idx
  on public.club_movement_type_config (club_id);
create index if not exists club_treasury_currencies_club_id_idx
  on public.club_treasury_currencies (club_id);
create index if not exists fx_operations_club_id_idx
  on public.fx_operations (club_id);
create index if not exists receipt_formats_club_id_idx
  on public.receipt_formats (club_id);
create index if not exists staff_contract_attachments_club_id_idx
  on public.staff_contract_attachments (club_id);
create index if not exists staff_contract_revisions_club_id_idx
  on public.staff_contract_revisions (club_id);

-- ----- account_id / session_id (joins frecuentes) -----
create index if not exists account_transfers_source_account_id_idx
  on public.account_transfers (source_account_id);
create index if not exists account_transfers_target_account_id_idx
  on public.account_transfers (target_account_id);
create index if not exists balance_adjustments_account_id_idx
  on public.balance_adjustments (account_id);
create index if not exists balance_adjustments_movement_id_idx
  on public.balance_adjustments (movement_id);
create index if not exists balance_adjustments_session_id_idx
  on public.balance_adjustments (session_id);
create index if not exists daily_cash_session_balances_account_id_idx
  on public.daily_cash_session_balances (account_id);
create index if not exists daily_cash_session_balances_session_id_idx
  on public.daily_cash_session_balances (session_id);
create index if not exists daily_cash_sessions_opened_by_user_id_idx
  on public.daily_cash_sessions (opened_by_user_id);
create index if not exists payroll_payment_batches_account_id_idx
  on public.payroll_payment_batches (account_id);

-- ----- treasury_movements joins criticos -----
create index if not exists treasury_movements_activity_id_idx
  on public.treasury_movements (activity_id);
create index if not exists treasury_movements_calendar_event_id_idx
  on public.treasury_movements (calendar_event_id);
create index if not exists treasury_movements_category_id_idx
  on public.treasury_movements (category_id);

-- ----- movement_integrations (consolidacion diaria) -----
create index if not exists movement_integrations_secretaria_movement_id_idx
  on public.movement_integrations (secretaria_movement_id);
create index if not exists movement_integrations_tesoreria_movement_id_idx
  on public.movement_integrations (tesoreria_movement_id);

-- ----- movement_audit_logs (rastreo por movement) -----
create index if not exists movement_audit_logs_movement_id_idx
  on public.movement_audit_logs (movement_id);

-- ----- salary_structures activity (RRHH reports) -----
create index if not exists salary_structures_activity_id_idx
  on public.salary_structures (activity_id);

-- ----- HR audit/operacional (rastreo por usuario) -----
create index if not exists hr_activity_log_performed_by_user_id_idx
  on public.hr_activity_log (performed_by_user_id);
create index if not exists payroll_settlements_annulled_by_user_id_idx
  on public.payroll_settlements (annulled_by_user_id);
create index if not exists staff_contract_attachments_uploaded_by_user_id_idx
  on public.staff_contract_attachments (uploaded_by_user_id);
create index if not exists staff_contracts_finalized_by_user_id_idx
  on public.staff_contracts (finalized_by_user_id);

-- ----- user preferences -----
create index if not exists user_club_preferences_last_active_club_id_idx
  on public.user_club_preferences (last_active_club_id);

-- ----- memberships -----
create index if not exists memberships_approved_by_user_id_idx
  on public.memberships (approved_by_user_id);
