/**
 * lib/services/treasury/_shared.ts — helpers internos compartidos por los
 * sub-módulos de treasury-service. NO es parte de la API pública: sólo lo
 * importan los archivos en `lib/services/treasury/*` y el barrel
 * `treasury-service.ts` durante el split progresivo (P2 audit).
 *
 * Convención: cualquier helper privado de treasury-service que sea
 * referenciado por más de un sub-módulo vive acá. Los helpers usados por
 * un solo sub-módulo se quedan local en ese archivo.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import type {
  ClubActivity,
  ClubCalendarEvent,
  DashboardTreasuryCard,
  ReceiptFormat,
  SessionBalanceDraft,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  MovementTypeConfig,
  TreasuryMovement,
  User,
} from "@/lib/domain/access";
import {
  accessRepository,
  isAccessRepositoryInfraError,
} from "@/lib/repositories/access-repository";
import { logger } from "@/lib/logger";
import { texts } from "@/lib/texts";
import type { TreasuryActionResult } from "./types";

export type TreasuryVisibilityRole = "secretaria" | "tesoreria";

const OPERATIONAL_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function getTodayDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export async function getSecretariaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    return null;
  }

  return context;
}

export async function getTesoreriaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateTesoreria(context.activeMembership)) {
    return null;
  }

  return context;
}

export function buildMovementSignedAmount(
  movementType: "ingreso" | "egreso",
  amount: number,
): number {
  return movementType === "ingreso" ? amount : amount * -1;
}

export function shouldIncludeMovementInRoleBalances(
  movement: Pick<TreasuryMovement, "status">,
  role: TreasuryVisibilityRole,
): boolean {
  if (role === "secretaria") {
    return true;
  }

  return movement.status === "posted" || movement.status === "consolidated";
}

export function getAccountsVisibleForRole(
  accounts: TreasuryAccount[],
  role: TreasuryVisibilityRole,
): TreasuryAccount[] {
  return accounts.filter((account) =>
    role === "secretaria" ? account.visibleForSecretaria : account.visibleForTesoreria,
  );
}

export function buildAccountBalances(
  account: TreasuryAccount,
  movements: Array<{
    accountId: string;
    currencyCode: string;
    movementType: "ingreso" | "egreso";
    amount: number;
  }>,
) {
  return account.currencies.map((currencyCode) => ({
    currencyCode,
    amount: movements
      .filter(
        (movement) =>
          movement.accountId === account.id && movement.currencyCode === currencyCode,
      )
      .reduce(
        (total, movement) =>
          total + buildMovementSignedAmount(movement.movementType, movement.amount),
        0,
      ),
  }));
}

export async function getConfiguredTreasuryCurrencies(
  clubId: string,
): Promise<TreasuryCurrencyConfig[]> {
  return [
    {
      clubId,
      currencyCode: "ARS",
      isPrimary: true,
    },
    {
      clubId,
      currencyCode: "USD",
      isPrimary: false,
    },
  ];
}

export async function getConfiguredMovementTypes(
  clubId: string,
): Promise<MovementTypeConfig[]> {
  return [
    { clubId, movementType: "ingreso", isEnabled: true },
    { clubId, movementType: "egreso", isEnabled: true },
  ];
}

export function validateReceiptNumberAgainstFormat(
  receiptNumber: string,
  receiptFormat: ReceiptFormat,
): boolean {
  if (receiptFormat.validationType === "numeric") {
    return /^[0-9]+$/.test(receiptNumber);
  }

  return /^[a-zA-Z0-9]+$/.test(receiptNumber);
}

export function isReceiptNumberValidForFormats(
  receiptNumber: string,
  activeReceiptFormats: ReceiptFormat[],
): boolean {
  if (receiptNumber.length === 0) {
    return true;
  }

  if (activeReceiptFormats.length === 0) {
    return false;
  }

  return activeReceiptFormats.some((format) =>
    validateReceiptNumberAgainstFormat(receiptNumber, format),
  );
}

export async function getActiveReceiptFormatsForRole(
  clubId: string,
  role: TreasuryVisibilityRole,
) {
  const receiptFormats = await accessRepository.listReceiptFormatsForClub(clubId);

  return receiptFormats.filter(
    (receiptFormat) =>
      receiptFormat.status === "active" &&
      (role === "secretaria"
        ? receiptFormat.visibleForSecretaria
        : receiptFormat.visibleForTesoreria),
  );
}

// ─── Date / operational window helpers ──────────────────────────────────────

export function getRelativeDate(date: string, deltaDays: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next.toISOString().slice(0, 10);
}

export function isValidOperationalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isMovementWithinOperationalWindow(
  movementDate: string,
  startDate: string,
  endDate: string,
): boolean {
  return movementDate >= startDate && movementDate <= endDate;
}

export function getDefaultConsolidationDate(): string {
  return getRelativeDate(getTodayDate(), -1);
}

// ─── Display IDs ─────────────────────────────────────────────────────────────

export function buildClubInitials(clubName: string): string {
  const initials = clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CLUB";
}

export async function generateMovementDisplayId(
  clubId: string,
  clubName: string,
  movementDate: string,
): Promise<string> {
  const year = movementDate.slice(0, 4);
  const prefix = buildClubInitials(clubName);
  const sequence = (await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year)) + 1;

  return `${prefix}-MOV-${year}-${sequence}`;
}

export async function generateMovementDisplayIds(
  clubId: string,
  clubName: string,
  movementDate: string,
  quantity: number,
): Promise<string[]> {
  const year = movementDate.slice(0, 4);
  const prefix = buildClubInitials(clubName);
  const baseSequence = await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year);

  return Array.from(
    { length: quantity },
    (_, index) => `${prefix}-MOV-${year}-${baseSequence + index + 1}`,
  );
}

// ─── Repository error helpers ────────────────────────────────────────────────

export function getRepositoryErrorCode(error: unknown): string | null {
  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return null;
  }

  const code = (error.cause as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function getRepositoryErrorMessage(error: unknown): string {
  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return "";
  }

  const message = (error.cause as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

export const KNOWN_CONSOLIDATION_INFRA_RPC_NAMES = [
  "get_daily_consolidation_batch_by_date_for_current_club",
  "create_daily_consolidation_batch_for_current_club",
  "update_daily_consolidation_batch_for_current_club",
  "get_movement_audit_logs_by_movement_id_for_current_club",
  "create_movement_audit_log_for_current_club",
  "update_treasury_movement_for_current_club",
] as const;

export const KNOWN_CONSOLIDATION_INFRA_OPERATIONS = [
  "get_daily_consolidation_batch_by_date",
  "create_daily_consolidation_batch",
  "update_daily_consolidation_batch",
  "list_movement_audit_logs_by_movement_id",
  "create_movement_audit_log",
  "update_treasury_movement",
] as const;

export function getMissingConsolidationRpcName(error: unknown): string | null {
  const message = getRepositoryErrorMessage(error).toLowerCase();

  return (
    KNOWN_CONSOLIDATION_INFRA_RPC_NAMES.find((rpcName) =>
      message.includes(rpcName.toLowerCase()),
    ) ?? null
  );
}

export function isConsolidationInfrastructureError(error: unknown): boolean {
  const code = getRepositoryErrorCode(error);
  const message = getRepositoryErrorMessage(error).toLowerCase();

  if (!isAccessRepositoryInfraError(error) || error.code !== "club_scoped_rpc_failed") {
    return false;
  }

  return (
    code === "42883" ||
    code === "42804" ||
    code === "PGRST202" ||
    KNOWN_CONSOLIDATION_INFRA_OPERATIONS.includes(
      error.operation as (typeof KNOWN_CONSOLIDATION_INFRA_OPERATIONS)[number],
    ) ||
    KNOWN_CONSOLIDATION_INFRA_RPC_NAMES.some((rpcName) =>
      message.includes(rpcName.toLowerCase()),
    ) ||
    message.includes("structure of query does not match function result type") ||
    message.includes("returned type timestamp without time zone") ||
    message.includes("does not exist") ||
    message.includes("could not find the function")
  );
}

export function resolveConsolidationInfrastructureFailure(
  operation: string,
  details: Record<string, unknown>,
  error: unknown,
): TreasuryActionResult | null {
  if (!isConsolidationInfrastructureError(error)) {
    return null;
  }

  logger.error("[treasury-consolidation-infrastructure-failure]", {
    operation,
    ...details,
    repositoryOperation: isAccessRepositoryInfraError(error) ? error.operation : null,
    repositoryCode: isAccessRepositoryInfraError(error) ? error.code : null,
    errorCode: getRepositoryErrorCode(error),
    missingRpcName: getMissingConsolidationRpcName(error),
    error,
  });

  return { ok: false, code: "infrastructure_incomplete" };
}

export function isSessionAlreadyExistsRepositoryError(error: unknown): boolean {
  const code = getRepositoryErrorCode(error);

  if (code === "23505") {
    return true;
  }

  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return false;
  }

  const message = (error.cause as { message?: unknown }).message;
  return typeof message === "string" && message.toLowerCase().includes("daily_cash_sessions");
}

export function isMissingStaleSessionAutoCloseRpcError(error: unknown): boolean {
  const code = getRepositoryErrorCode(error);

  if (code === "42883" || code === "PGRST202") {
    return true;
  }

  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return false;
  }

  const message = String((error.cause as { message?: unknown }).message ?? "").toLowerCase();

  return (
    message.includes("get_last_open_daily_cash_session_before_date_for_current_club") ||
    message.includes("auto_close_stale_daily_cash_session_for_club") ||
    (message.includes("function") && message.includes("does not exist"))
  );
}

export function isMissingBulkMovementHistoryRpcError(error: unknown): boolean {
  const code = getRepositoryErrorCode(error);

  if (code === "42883" || code === "PGRST202") {
    return true;
  }

  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return false;
  }

  const message = String((error.cause as { message?: unknown }).message ?? "").toLowerCase();

  return (
    message.includes("get_treasury_movements_history_by_accounts_for_current_club") ||
    (message.includes("function") && message.includes("does not exist"))
  );
}

export function logTreasuryServiceFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown,
): void {
  logger.error("[treasury-service-failure]", {
    operation,
    ...details,
    ...(error === undefined ? {} : { error }),
  });
}

export const warnedMissingStaleSessionAutoCloseRpcClubIds = new Set<string>();

// ─── Balance + movement helpers ──────────────────────────────────────────────

export async function getAvailableBalanceForAccountCurrency(input: {
  clubId: string;
  accountId: string;
  currencyCode: string;
  effectiveDate?: string;
  excludeMovementId?: string;
  role?: TreasuryVisibilityRole;
}): Promise<number> {
  const movements = await accessRepository.listTreasuryMovementsHistoryByAccount(
    input.clubId,
    input.accountId,
  );

  return movements
    .filter((movement) =>
      shouldIncludeMovementInRoleBalances(movement, input.role ?? "secretaria"),
    )
    .filter((movement) => movement.currencyCode === input.currencyCode)
    .filter((movement) => !input.effectiveDate || movement.movementDate <= input.effectiveDate)
    .filter((movement) => !input.excludeMovementId || movement.id !== input.excludeMovementId)
    .reduce(
      (total, movement) =>
        total + buildMovementSignedAmount(movement.movementType, movement.amount),
      0,
    );
}

export function serializeMovementSnapshot(movement: TreasuryMovement) {
  return {
    accountId: movement.accountId,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    activityId: movement.activityId ?? null,
    receiptNumber: movement.receiptNumber ?? null,
    calendarEventId: movement.calendarEventId ?? null,
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: movement.amount,
    status: movement.status,
    movementDate: movement.movementDate,
  };
}

export async function getSecretariaAccounts(clubId: string): Promise<TreasuryAccount[]> {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.visibleForSecretaria);
}

export async function getTesoreriaAccounts(clubId: string): Promise<TreasuryAccount[]> {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.visibleForTesoreria);
}

export function getTransferTargetAccountsForSecretaria(
  accounts: TreasuryAccount[],
): TreasuryAccount[] {
  return accounts.filter((account) => !account.visibleForSecretaria && account.visibleForTesoreria);
}

export function buildDashboardMovementView(input: {
  movement: TreasuryMovement;
  accountsById: Map<string, TreasuryAccount>;
  categoriesById: Map<string, TreasuryCategory>;
  activitiesById: Map<string, ClubActivity>;
  calendarEventsById: Map<string, ClubCalendarEvent>;
  usersById: Map<string, User>;
  canEdit: boolean;
  costCenterIdsByMovement?: Map<string, string[]>;
}): DashboardTreasuryCard["movements"][number] {
  const {
    movement,
    accountsById,
    categoriesById,
    activitiesById,
    calendarEventsById,
    usersById,
    canEdit,
    costCenterIdsByMovement,
  } = input;

  return {
    movementId: movement.id,
    movementDisplayId: movement.displayId,
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    accountName: accountsById.get(movement.accountId)?.name ?? "",
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    categoryName:
      categoriesById.get(movement.categoryId)?.name ??
      texts.dashboard.treasury.detail_uncategorized_category,
    activityId: movement.activityId ?? null,
    activityName: movement.activityId
      ? activitiesById.get(movement.activityId)?.name ?? null
      : null,
    receiptNumber: movement.receiptNumber ?? null,
    calendarEventId: movement.calendarEventId ?? null,
    calendarEventTitle: movement.calendarEventId
      ? calendarEventsById.get(movement.calendarEventId)?.title ?? null
      : null,
    transferReference: movement.transferGroupId ?? null,
    fxOperationReference: movement.fxOperationGroupId ?? null,
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: movement.amount,
    createdByUserName: usersById.get(movement.createdByUserId)?.fullName ?? "",
    createdAt: movement.createdAt,
    canEdit,
    staffContractId: movement.staffContractId ?? null,
    costCenterIds: costCenterIdsByMovement?.get(movement.id) ?? [],
  };
}

export function isTreasuryRoleMovementEditable(movement: TreasuryMovement): boolean {
  return (
    movement.status === "posted" && !movement.transferGroupId && !movement.fxOperationGroupId
  );
}

export async function buildAccountBalanceDrafts(
  clubId: string,
  sessionDate: string,
  accounts: TreasuryAccount[],
): Promise<SessionBalanceDraft[]> {
  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: (
        await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)
      ).filter(
        (movement) =>
          movement.movementDate <= sessionDate &&
          shouldIncludeMovementInRoleBalances(movement, "secretaria"),
      ),
    })),
  );

  return movementsByAccount.flatMap(({ account, movements }) =>
    account.currencies.map((currencyCode) => {
      const expectedBalance = movements
        .filter((movement) => movement.currencyCode === currencyCode)
        .reduce(
          (total, movement) =>
            total + buildMovementSignedAmount(movement.movementType, movement.amount),
          0,
        );

      return {
        accountId: account.id,
        accountName: account.name,
        currencyCode,
        expectedBalance,
        declaredBalance: expectedBalance,
        differenceAmount: 0,
        adjustmentType: null,
      } satisfies SessionBalanceDraft;
    }),
  );
}
