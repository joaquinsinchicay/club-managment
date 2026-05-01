-- Dropea el overload deprecado de update_treasury_movement_for_current_club que NO
-- recibe p_movement_date. Estaba marcado DEPRECATED desde 2026-04-16
-- (migration 20260416182752 repair_treasury_rpc_timestamp_drift_and_document_deprecations).
--
-- El fallback en lib/repositories/access-repository.ts (función isLegacyUpdate-
-- TreasuryMovementRpcCause + retry sin p_movement_date) se removió en el mismo
-- commit, así que no queda ningún consumidor en repo.
--
-- La firma vigente sigue viva (con p_movement_date), creada en migration
-- 20260413113000 allow_editing_movement_date_during_consolidation.
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 2 · Media).

drop function if exists public.update_treasury_movement_for_current_club(
  uuid,        -- p_club_id
  uuid,        -- p_movement_id
  uuid,        -- p_account_id
  movement_type,
  uuid,        -- p_category_id
  text,        -- p_concept
  text,        -- p_currency_code
  numeric,     -- p_amount
  uuid,        -- p_activity_id
  text,        -- p_receipt_number
  uuid,        -- p_calendar_event_id
  movement_status,
  uuid         -- p_consolidation_batch_id
);
