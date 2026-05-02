import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ConsolidationAuditEntry,
  ConsolidationMovement,
  DailyCashSessionValidation,
  DashboardTreasuryCard,
  SessionBalanceDraft,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
  TreasuryMovementType,
  TreasuryConsolidationDashboard,
  TreasuryMovement,
  TreasuryMovementStatus,
  User
} from "@/lib/domain/access";
import { accessRepository, isAccessRepositoryInfraError } from "@/lib/repositories/access-repository";
import { costCenterRepository } from "@/lib/repositories/cost-center-repository";
import { texts } from "@/lib/texts";
import { logger } from "@/lib/logger";
import {
  buildAccountBalanceDrafts,
  buildAccountBalances,
  buildClubInitials,
  buildDashboardMovementView,
  buildMovementSignedAmount,
  generateMovementDisplayId,
  generateMovementDisplayIds,
  getAccountsVisibleForRole,
  getActiveReceiptFormatsForRole,
  getAvailableBalanceForAccountCurrency,
  getConfiguredMovementTypes,
  getConfiguredTreasuryCurrencies,
  getDefaultConsolidationDate,
  getRelativeDate,
  getRepositoryErrorCode,
  getRepositoryErrorMessage,
  getSecretariaAccounts,
  getSecretariaSession,
  getTesoreriaAccounts,
  getTesoreriaSession,
  getTodayDate,
  getTransferTargetAccountsForSecretaria,
  isMissingBulkMovementHistoryRpcError,
  isMissingStaleSessionAutoCloseRpcError,
  isMovementWithinOperationalWindow,
  isReceiptNumberValidForFormats,
  isSessionAlreadyExistsRepositoryError,
  isTreasuryRoleMovementEditable,
  isValidOperationalDate,
  logTreasuryServiceFailure,
  resolveConsolidationInfrastructureFailure,
  serializeMovementSnapshot,
  shouldIncludeMovementInRoleBalances,
  validateReceiptNumberAgainstFormat,
  warnedMissingStaleSessionAutoCloseRpcClubIds,
  type TreasuryVisibilityRole,
} from "./treasury/_shared";

// Tipos públicos extraídos a ./treasury/types.ts (P2 audit · service split).
import type {
  TreasuryActionCode,
  TreasuryActionResult,
  TreasuryActionResultWithOptimisticUpdate,
  TreasuryMovementOptimisticUpdate,
} from "./treasury/types";
export type {
  TreasuryActionResult,
  TreasuryMovementOptimisticUpdate,
  TreasuryActionResultWithOptimisticUpdate,
} from "./treasury/types";






// ─── Lookups (extracted to ./treasury/lookups.ts in P2 audit · service split) ───
export {
  getActiveActivitiesForSecretaria,
  getActiveActivitiesForTesoreria,
  getEnabledCalendarEventsForSecretaria,
  getEnabledCalendarEventsForTesoreria,
  getActiveTreasuryCurrenciesForSecretaria,
  getActiveTreasuryCurrenciesForTesoreria,
  getEnabledMovementTypesForSecretaria,
  getEnabledMovementTypesForTesoreria,
  getActiveReceiptFormatsForSecretaria,
  getActiveReceiptFormatsForTesoreria,
  getTreasuryAccountDetailForActiveClub,
} from "./treasury/lookups";

// ─── FX (extracted to ./treasury/fx.ts in P2 audit · service split) ───
export { createFxOperation } from "./treasury/fx";

// ─── Transfers (extracted to ./treasury/transfers.ts in P2 audit · service split) ───
export {
  createAccountTransfer,
  updateSecretariaTransferInOpenSession,
} from "./treasury/transfers";

// ─── Sessions (extracted to ./treasury/sessions.ts in P2 audit · service split) ───
import { ensureStaleDailyCashSessionAutoClosedForActiveClub } from "./treasury/sessions";
export {
  ensureStaleDailyCashSessionAutoClosedForActiveClub,
  ensureDailyCashSessionGuardSafe,
  getDailyCashSessionValidationForActiveClub,
  openDailyCashSessionWithDeclaredBalances,
  closeDailyCashSessionWithDeclaredBalances,
} from "./treasury/sessions";

// ─── Dashboard (extracted to ./treasury/dashboard.ts in P2 audit · service split) ───
export {
  getDashboardTreasuryCardForActiveClub,
  getTreasuryRoleDashboardForActiveClub,
} from "./treasury/dashboard";

// ─── Movements (extracted to ./treasury/movements.ts in P2 audit · service split) ───
export {
  createTreasuryMovement,
  updateSecretariaMovementInOpenSession,
  createTreasuryRoleMovement,
  updateTreasuryRoleMovement,
} from "./treasury/movements";

// ─── Consolidation (extracted to ./treasury/consolidation.ts in P2 audit · service split) ───
export {
  getTreasuryConsolidationDashboard,
  getMovementAuditEntries,
  updateMovementBeforeConsolidation,
  updateTransferBeforeConsolidation,
  integrateMatchingMovement,
  executeDailyConsolidation,
} from "./treasury/consolidation";
