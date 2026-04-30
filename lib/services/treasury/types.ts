/**
 * lib/services/treasury/types.ts — tipos públicos del módulo treasury.
 *
 * Re-exportados desde `lib/services/treasury-service` para compatibilidad
 * con callsites existentes.
 */
import type { DashboardTreasuryCard } from "@/lib/domain/access";

export type TreasuryActionCode =
  | "session_opened"
  | "session_closed"
  | "session_open_failed"
  | "session_close_failed"
  | "movement_created"
  | "movement_create_failed"
  | "movement_updated"
  | "movement_update_failed"
  | "movement_integrated"
  | "transfer_created"
  | "fx_operation_created"
  | "consolidation_completed"
  | "forbidden"
  | "session_already_exists"
  | "session_not_open"
  | "previous_session_still_open"
  | "session_required"
  | "account_required"
  | "category_required"
  | "movement_type_required"
  | "concept_required"
  | "currency_required"
  | "amount_required"
  | "amount_must_be_positive"
  | "invalid_account"
  | "invalid_category"
  | "invalid_activity"
  | "invalid_currency"
  | "source_account_required"
  | "target_account_required"
  | "accounts_must_be_distinct"
  | "invalid_transfer"
  | "insufficient_funds"
  | "source_currency_required"
  | "target_currency_required"
  | "currencies_must_be_distinct"
  | "source_amount_required"
  | "target_amount_required"
  | "invalid_fx_operation"
  | "movement_not_found"
  | "movement_not_editable"
  | "movement_date_required"
  | "invalid_movement_date"
  | "invalid_match"
  | "consolidation_date_required"
  | "consolidation_already_completed"
  | "consolidation_has_invalid_movements"
  | "invalid_receipt_format"
  | "invalid_calendar_event"
  | "no_accounts_available"
  | "declared_balance_required"
  | "declared_balance_invalid"
  | "adjustment_category_missing"
  | "infrastructure_incomplete"
  | "unknown_error";

export type TreasuryActionResult = {
  ok: boolean;
  code: TreasuryActionCode;
  movementDisplayId?: string;
  // US-53: exposed so the caller can link the fresh movement to cost centers
  // right after creation/update without a separate lookup by displayId.
  movementId?: string;
};

export type TreasuryMovementOptimisticUpdate = {
  movement: DashboardTreasuryCard["movements"][number];
  balanceDelta: {
    accountId: string;
    currencyCode: string;
    amountDelta: number;
  };
};

export type TreasuryActionResultWithOptimisticUpdate = TreasuryActionResult & {
  optimisticUpdate?: TreasuryMovementOptimisticUpdate;
};
