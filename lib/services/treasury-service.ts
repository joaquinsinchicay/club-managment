import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { parseLocalizedAmount } from "@/lib/amounts";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ConsolidationAuditEntry,
  ConsolidationMovement,
  DailyCashSessionValidation,
  DashboardTreasuryCard,
  MovementTypeConfig,
  ReceiptFormat,
  SessionBalanceDraft,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
  TreasuryAccountDetail,
  TreasuryConsolidationDashboard,
  TreasuryMovement,
  TreasuryMovementStatus,
  User
} from "@/lib/domain/access";
import { accessRepository, isAccessRepositoryInfraError } from "@/lib/repositories/access-repository";
import { texts } from "@/lib/texts";

type TreasuryVisibilityRole = "secretaria" | "tesoreria";

async function getActiveReceiptFormatsForRole(clubId: string, role: TreasuryVisibilityRole) {
  const receiptFormats = await accessRepository.listReceiptFormatsForClub(clubId);

  return receiptFormats.filter(
    (receiptFormat) =>
      receiptFormat.status === "active" &&
      (role === "secretaria" ? receiptFormat.visibleForSecretaria : receiptFormat.visibleForTesoreria)
  );
}

function isReceiptNumberValidForFormats(receiptNumber: string, activeReceiptFormats: ReceiptFormat[]) {
  if (receiptNumber.length === 0) {
    return true;
  }

  if (activeReceiptFormats.length === 0) {
    return false;
  }

  return activeReceiptFormats.some((format) => validateReceiptNumberAgainstFormat(receiptNumber, format));
}

type TreasuryActionCode =
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

type SessionAdjustmentEntry = {
  displayId: string;
  accountId: string;
  movementType: TreasuryMovementType;
  categoryId: string;
  concept: string;
  currencyCode: string;
  amount: number;
  movementDate: string;
  createdByUserId: string;
  status: TreasuryMovementStatus;
  differenceAmount: number;
  adjustmentMoment: "opening" | "closing";
};

const OPERATIONAL_TIME_ZONE = "America/Argentina/Buenos_Aires";

function getTodayDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getRelativeDate(date: string, deltaDays: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next.toISOString().slice(0, 10);
}

function isValidOperationalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function buildClubInitials(clubName: string) {
  const initials = clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "CLUB";
}

function getRepositoryErrorCode(error: unknown) {
  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return null;
  }

  const code = (error.cause as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function getRepositoryErrorMessage(error: unknown) {
  if (!isAccessRepositoryInfraError(error) || !error.cause || typeof error.cause !== "object") {
    return "";
  }

  const message = (error.cause as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

const KNOWN_CONSOLIDATION_INFRA_RPC_NAMES = [
  "get_daily_consolidation_batch_by_date_for_current_club",
  "create_daily_consolidation_batch_for_current_club",
  "update_daily_consolidation_batch_for_current_club",
  "get_movement_audit_logs_by_movement_id_for_current_club",
  "create_movement_audit_log_for_current_club",
  "update_treasury_movement_for_current_club"
] as const;

const KNOWN_CONSOLIDATION_INFRA_OPERATIONS = [
  "get_daily_consolidation_batch_by_date",
  "create_daily_consolidation_batch",
  "update_daily_consolidation_batch",
  "list_movement_audit_logs_by_movement_id",
  "create_movement_audit_log",
  "update_treasury_movement"
] as const;

function getMissingConsolidationRpcName(error: unknown) {
  const message = getRepositoryErrorMessage(error).toLowerCase();

  return (
    KNOWN_CONSOLIDATION_INFRA_RPC_NAMES.find((rpcName) => message.includes(rpcName.toLowerCase())) ?? null
  );
}

function isConsolidationInfrastructureError(error: unknown) {
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
      error.operation as (typeof KNOWN_CONSOLIDATION_INFRA_OPERATIONS)[number]
    ) ||
    KNOWN_CONSOLIDATION_INFRA_RPC_NAMES.some((rpcName) => message.includes(rpcName.toLowerCase())) ||
    message.includes("structure of query does not match function result type") ||
    message.includes("returned type timestamp without time zone") ||
    message.includes("does not exist") ||
    message.includes("could not find the function")
  );
}

function resolveConsolidationInfrastructureFailure(
  operation: string,
  details: Record<string, unknown>,
  error: unknown
): TreasuryActionResult | null {
  if (!isConsolidationInfrastructureError(error)) {
    return null;
  }

  console.error("[treasury-consolidation-infrastructure-failure]", {
    operation,
    ...details,
    repositoryOperation: isAccessRepositoryInfraError(error) ? error.operation : null,
    repositoryCode: isAccessRepositoryInfraError(error) ? error.code : null,
    errorCode: getRepositoryErrorCode(error),
    missingRpcName: getMissingConsolidationRpcName(error),
    error
  });

  return { ok: false, code: "infrastructure_incomplete" };
}

function isSessionAlreadyExistsRepositoryError(error: unknown) {
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

function isMissingStaleSessionAutoCloseRpcError(error: unknown) {
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
    message.includes("auto_close_stale_daily_cash_session_with_balances_for_current_club") ||
    message.includes("function") && message.includes("does not exist")
  );
}

function isMissingBulkMovementHistoryRpcError(error: unknown) {
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

function logTreasuryServiceFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown
) {
  console.error("[treasury-service-failure]", {
    operation,
    ...details,
    ...(error === undefined ? {} : { error })
  });
}

const warnedMissingStaleSessionAutoCloseRpcClubIds = new Set<string>();

async function generateMovementDisplayId(clubId: string, clubName: string, movementDate: string) {
  const year = movementDate.slice(0, 4);
  const prefix = buildClubInitials(clubName);
  const sequence = (await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year)) + 1;

  return `${prefix}-MOV-${year}-${sequence}`;
}

async function generateMovementDisplayIds(
  clubId: string,
  clubName: string,
  movementDate: string,
  quantity: number
) {
  const year = movementDate.slice(0, 4);
  const prefix = buildClubInitials(clubName);
  const baseSequence = await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year);

  return Array.from({ length: quantity }, (_, index) => `${prefix}-MOV-${year}-${baseSequence + index + 1}`);
}

function getDefaultConsolidationDate() {
  return getRelativeDate(getTodayDate(), -1);
}

async function getSecretariaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    return null;
  }

  return context;
}

async function getTesoreriaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateTesoreria(context.activeMembership)) {
    return null;
  }

  return context;
}

function buildMovementSignedAmount(movementType: "ingreso" | "egreso", amount: number) {
  return movementType === "ingreso" ? amount : amount * -1;
}

async function getAvailableBalanceForAccountCurrency(input: {
  clubId: string;
  accountId: string;
  currencyCode: string;
  effectiveDate?: string;
  excludeMovementId?: string;
  role?: TreasuryVisibilityRole;
}) {
  const movements = await accessRepository.listTreasuryMovementsHistoryByAccount(input.clubId, input.accountId);

  return movements
    .filter((movement) => shouldIncludeMovementInRoleBalances(movement, input.role ?? "secretaria"))
    .filter((movement) => movement.currencyCode === input.currencyCode)
    .filter((movement) => !input.effectiveDate || movement.movementDate <= input.effectiveDate)
    .filter((movement) => !input.excludeMovementId || movement.id !== input.excludeMovementId)
    .reduce((total, movement) => total + buildMovementSignedAmount(movement.movementType, movement.amount), 0);
}

function shouldIncludeMovementInRoleBalances(
  movement: Pick<TreasuryMovement, "status">,
  role: TreasuryVisibilityRole
) {
  if (role === "secretaria") {
    return true;
  }

  return movement.status === "posted" || movement.status === "consolidated";
}

function serializeMovementSnapshot(movement: TreasuryMovement) {
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
    movementDate: movement.movementDate
  };
}

async function getSecretariaAccounts(clubId: string) {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.visibleForSecretaria);
}

async function getTesoreriaAccounts(clubId: string) {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.visibleForTesoreria);
}

function getAccountsVisibleForRole(
  accounts: TreasuryAccount[],
  role: TreasuryVisibilityRole
) {
  return accounts.filter((account) =>
    role === "secretaria" ? account.visibleForSecretaria : account.visibleForTesoreria
  );
}

function getTransferTargetAccountsForSecretaria(accounts: TreasuryAccount[]) {
  return accounts.filter((account) => !account.visibleForSecretaria && account.visibleForTesoreria);
}

function buildAccountBalances(
  account: TreasuryAccount,
  movements: Array<{
    accountId: string;
    currencyCode: string;
    movementType: "ingreso" | "egreso";
    amount: number;
  }>
) {
  return account.currencies.map((currencyCode) => ({
    currencyCode,
    amount: movements
      .filter((movement) => movement.accountId === account.id && movement.currencyCode === currencyCode)
      .reduce((total, movement) => total + buildMovementSignedAmount(movement.movementType, movement.amount), 0)
  }));
}

function buildDashboardMovementView(input: {
  movement: TreasuryMovement;
  accountsById: Map<string, TreasuryAccount>;
  categoriesById: Map<string, TreasuryCategory>;
  activitiesById: Map<string, ClubActivity>;
  calendarEventsById: Map<string, ClubCalendarEvent>;
  usersById: Map<string, User>;
  canEdit: boolean;
}): DashboardTreasuryCard["movements"][number] {
  const { movement, accountsById, categoriesById, activitiesById, calendarEventsById, usersById, canEdit } = input;

  return {
    movementId: movement.id,
    movementDisplayId: movement.displayId,
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    accountName: accountsById.get(movement.accountId)?.name ?? "",
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    categoryName: categoriesById.get(movement.categoryId)?.name ?? texts.dashboard.treasury.detail_uncategorized_category,
    activityId: movement.activityId ?? null,
    activityName: movement.activityId ? activitiesById.get(movement.activityId)?.name ?? null : null,
    receiptNumber: movement.receiptNumber ?? null,
    calendarEventId: movement.calendarEventId ?? null,
    calendarEventTitle: movement.calendarEventId ? calendarEventsById.get(movement.calendarEventId)?.title ?? null : null,
    transferReference: movement.transferGroupId ?? null,
    fxOperationReference: movement.fxOperationGroupId ?? null,
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: movement.amount,
    createdByUserName: usersById.get(movement.createdByUserId)?.fullName ?? "",
    createdAt: movement.createdAt,
    canEdit
  };
}

function isTreasuryRoleMovementEditable(movement: TreasuryMovement) {
  return movement.status === "posted" && !movement.transferGroupId && !movement.fxOperationGroupId;
}

function isMovementWithinOperationalWindow(movementDate: string, startDate: string, endDate: string) {
  return movementDate >= startDate && movementDate <= endDate;
}

async function getConfiguredTreasuryCurrencies(clubId: string): Promise<TreasuryCurrencyConfig[]> {
  return [
    {
      clubId,
      currencyCode: "ARS",
      isPrimary: true
    },
    {
      clubId,
      currencyCode: "USD",
      isPrimary: false
    }
  ];
}

async function getConfiguredMovementTypes(clubId: string): Promise<MovementTypeConfig[]> {
  return [
    {
      clubId,
      movementType: "ingreso",
      isEnabled: true
    },
    {
      clubId,
      movementType: "egreso",
      isEnabled: true
    }
  ];
}

async function buildAccountBalanceDrafts(
  clubId: string,
  sessionDate: string,
  accounts: TreasuryAccount[]
): Promise<SessionBalanceDraft[]> {
  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: (await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)).filter(
        (movement) =>
          movement.movementDate <= sessionDate &&
          shouldIncludeMovementInRoleBalances(movement, "secretaria")
      )
    }))
  );

  return movementsByAccount.flatMap(({ account, movements }) =>
    account.currencies.map((currencyCode) => {
      const expectedBalance = movements
        .filter((movement) => movement.currencyCode === currencyCode)
        .reduce(
          (total, movement) => total + buildMovementSignedAmount(movement.movementType, movement.amount),
          0
        );

      return {
        accountId: account.id,
        accountName: account.name,
        currencyCode,
        expectedBalance,
        declaredBalance: expectedBalance,
        differenceAmount: 0,
        adjustmentType: null
      } satisfies SessionBalanceDraft;
    })
  );
}

async function reconcileStaleOpenDailyCashSessionForActiveClub(context: {
  activeClub: { id: string };
  user: { id: string };
}) {
  try {
    const todayDate = getTodayDate();
    const staleSession = await accessRepository.getLastOpenDailyCashSessionBeforeDate(
      context.activeClub.id,
      todayDate
    );

    if (!staleSession) {
      return null;
    }

    const accounts = await getSecretariaAccounts(context.activeClub.id);
    const drafts = await buildAccountBalanceDrafts(context.activeClub.id, staleSession.sessionDate, accounts);

    return await accessRepository.autoCloseStaleDailyCashSessionWithBalances({
      clubId: context.activeClub.id,
      beforeDate: todayDate,
      expectedSessionId: staleSession.id,
      closedByUserId: context.user.id,
      balances: buildSessionBalanceEntries(drafts, "closing")
    });
  } catch (error) {
    if (isMissingStaleSessionAutoCloseRpcError(error)) {
      if (!warnedMissingStaleSessionAutoCloseRpcClubIds.has(context.activeClub.id)) {
        warnedMissingStaleSessionAutoCloseRpcClubIds.add(context.activeClub.id);
        console.warn("[stale-session-autoclose-rpc-missing]", {
          clubId: context.activeClub.id
        });
      }
      return null;
    }

    throw error;
  }
}

function buildDraftFromDeclaredValue(
  draft: SessionBalanceDraft,
  declaredBalance: number
): SessionBalanceDraft {
  const differenceAmount = declaredBalance - draft.expectedBalance;

  return {
    ...draft,
    declaredBalance,
    differenceAmount,
    adjustmentType:
      differenceAmount === 0 ? null : differenceAmount > 0 ? "ingreso" : "egreso"
  };
}

async function getSessionValidationBase(
  mode: "open" | "close"
): Promise<{
  clubId: string;
  sessionDate: string;
  sessionStatus: "open" | "closed" | "not_started";
  sessionId: string | null;
  accounts: SessionBalanceDraft[];
} | null> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return null;
  }

  const sessionDate = getTodayDate();
  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: context.activeClub.id },
      user: { id: context.user.id }
    });
    [session] = await Promise.all([
      accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate)
    ]);
  } catch (error) {
    console.error("[session-state-resolution-failed]", {
      operation: "get_session_validation_base",
      mode,
      clubId: context.activeClub.id,
      sessionDate,
      error
    });
    return null;
  }

  const accounts = await getSecretariaAccounts(context.activeClub.id);

  if (mode === "open" && session) {
    return {
      clubId: context.activeClub.id,
      sessionDate,
      sessionStatus: session.status,
      sessionId: session.id,
      accounts: []
    };
  }

  if (mode === "close" && (!session || session.status !== "open")) {
    return {
      clubId: context.activeClub.id,
      sessionDate,
      sessionStatus: session?.status ?? "not_started",
      sessionId: session?.id ?? null,
      accounts: []
    };
  }

  try {
    return {
      clubId: context.activeClub.id,
      sessionDate,
      sessionStatus: session?.status ?? "not_started",
      sessionId: session?.id ?? null,
      accounts: await buildAccountBalanceDrafts(context.activeClub.id, sessionDate, accounts)
    };
  } catch (error) {
    console.error("[session-balance-data-resolution-failed]", {
      operation: "get_session_validation_base",
      mode,
      clubId: context.activeClub.id,
      sessionDate,
      error
    });
    return null;
  }
}

export async function getDailyCashSessionValidationForActiveClub(
  mode: "open" | "close"
): Promise<DailyCashSessionValidation | null> {
  const base = await getSessionValidationBase(mode);

  if (!base) {
    return null;
  }

  return {
    mode,
    sessionDate: base.sessionDate,
    sessionStatus: base.sessionStatus,
    accounts: base.accounts,
    hasDifferences: base.accounts.some((account) => account.differenceAmount !== 0)
  };
}

async function validateDeclaredBalances(
  mode: "open" | "close",
  input: Array<{
    accountId: string;
    currencyCode: string;
    declaredBalance: string;
  }>
): Promise<
  | {
      ok: false;
      code: TreasuryActionCode;
    }
  | {
      ok: true;
      clubId: string;
      clubName: string;
      userId: string;
      sessionDate: string;
      sessionId: string | null;
      drafts: SessionBalanceDraft[];
    }
> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const base = await getSessionValidationBase(mode);

  if (!base) {
    return { ok: false, code: "forbidden" };
  }

  if (mode === "open" && base.sessionId) {
    return { ok: false, code: "session_already_exists" };
  }

  if (mode === "close" && !base.sessionId) {
    return { ok: false, code: "session_not_open" };
  }

  if (base.accounts.length === 0) {
    return { ok: false, code: "no_accounts_available" };
  }

  const inputMap = new Map(
    input.map((entry) => [`${entry.accountId}:${entry.currencyCode}`, entry.declaredBalance])
  );

  const drafts: SessionBalanceDraft[] = [];

  for (const draft of base.accounts) {
    const key = `${draft.accountId}:${draft.currencyCode}`;
    const rawDeclared = inputMap.get(key);

    if (rawDeclared === undefined || rawDeclared.trim() === "") {
      return { ok: false, code: "declared_balance_required" };
    }

    const parsed = parseLocalizedAmount(rawDeclared);

    if (parsed === null) {
      return { ok: false, code: "declared_balance_invalid" };
    }

    drafts.push(buildDraftFromDeclaredValue(draft, parsed));
  }

  return {
    ok: true,
    clubId: context.activeClub.id,
    clubName: context.activeClub.name,
    userId: context.user.id,
    sessionDate: base.sessionDate,
    sessionId: base.sessionId,
    drafts
  };
}

function buildSessionBalanceEntries(
  drafts: SessionBalanceDraft[],
  balanceMoment: "opening" | "closing"
) {
  return drafts.map((draft) => ({
    accountId: draft.accountId,
    currencyCode: draft.currencyCode,
    balanceMoment,
    expectedBalance: draft.expectedBalance,
    declaredBalance: draft.declaredBalance,
    differenceAmount: draft.differenceAmount
  }));
}

async function buildBalanceAdjustmentEntries(input: {
  clubId: string;
  clubName: string;
  userId: string;
  sessionDate: string;
  mode: "open" | "close";
  drafts: SessionBalanceDraft[];
}) {
  const draftsWithAdjustments = input.drafts.filter((entry) => entry.differenceAmount !== 0 && entry.adjustmentType);

  if (draftsWithAdjustments.length === 0) {
    return { ok: true, adjustments: [] as SessionAdjustmentEntry[] } as const;
  }

  const adjustmentCategory = await accessRepository.findTreasuryAdjustmentCategory(input.clubId);

  if (!adjustmentCategory) {
    return { ok: false, code: "adjustment_category_missing" } as const;
  }

  const year = input.sessionDate.slice(0, 4);
  const prefix = buildClubInitials(input.clubName);
  const startingSequence = await accessRepository.countTreasuryMovementsByClubAndYear(input.clubId, year);

  return {
    ok: true,
    adjustments: draftsWithAdjustments.map((draft, index): SessionAdjustmentEntry => ({
      displayId: `${prefix}-MOV-${year}-${startingSequence + index + 1}`,
      accountId: draft.accountId,
      movementType: draft.adjustmentType!,
      categoryId: adjustmentCategory.id,
      concept: `${adjustmentCategory.name} ${input.mode === "open" ? "de apertura" : "de cierre"}`,
      currencyCode: draft.currencyCode,
      amount: Math.abs(draft.differenceAmount),
      movementDate: input.sessionDate,
      createdByUserId: input.userId,
      status: "pending_consolidation" as const,
      differenceAmount: draft.differenceAmount,
      adjustmentMoment: input.mode === "open" ? "opening" : "closing"
    }))
  } as const;
}

export async function openDailyCashSessionWithDeclaredBalances(input: Array<{
  accountId: string;
  currencyCode: string;
  declaredBalance: string;
}>): Promise<TreasuryActionResult> {
  const validation = await validateDeclaredBalances("open", input);

  if (!validation.ok) {
    return validation;
  }

  let adjustmentEntries: Awaited<ReturnType<typeof buildBalanceAdjustmentEntries>>;

  try {
    adjustmentEntries = await buildBalanceAdjustmentEntries({
      clubId: validation.clubId,
      clubName: validation.clubName,
      userId: validation.userId,
      sessionDate: validation.sessionDate,
      mode: "open",
      drafts: validation.drafts
    });
  } catch (error) {
    console.error("[open-session-adjustment-preparation-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      userId: validation.userId,
      error
    });
    return { ok: false, code: "session_open_failed" };
  }

  if (!adjustmentEntries.ok) {
    return adjustmentEntries;
  }

  try {
    const createdSession = await accessRepository.openDailyCashSessionWithBalances({
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      openedByUserId: validation.userId,
      balances: buildSessionBalanceEntries(validation.drafts, "opening"),
      adjustments: adjustmentEntries.adjustments
    });

    if (!createdSession) {
      return { ok: false, code: "session_open_failed" };
    }

    return { ok: true, code: "session_opened" };
  } catch (error) {
    if (isSessionAlreadyExistsRepositoryError(error)) {
      return { ok: false, code: "session_already_exists" };
    }

    console.error("[open-session-atomic-write-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      userId: validation.userId,
      operation: "open_daily_cash_session_with_balances",
      error
    });
    return { ok: false, code: "session_open_failed" };
  }
}

export async function closeDailyCashSessionWithDeclaredBalances(input: Array<{
  accountId: string;
  currencyCode: string;
  declaredBalance: string;
}>): Promise<TreasuryActionResult> {
  const validation = await validateDeclaredBalances("close", input);

  if (!validation.ok || !validation.sessionId) {
    return validation.ok ? { ok: false, code: "session_not_open" } : validation;
  }

  let adjustmentEntries: Awaited<ReturnType<typeof buildBalanceAdjustmentEntries>>;

  try {
    adjustmentEntries = await buildBalanceAdjustmentEntries({
      clubId: validation.clubId,
      clubName: validation.clubName,
      userId: validation.userId,
      sessionDate: validation.sessionDate,
      mode: "close",
      drafts: validation.drafts
    });
  } catch (error) {
    console.error("[close-session-adjustment-preparation-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      sessionId: validation.sessionId,
      userId: validation.userId,
      error
    });
    return { ok: false, code: "session_close_failed" };
  }

  if (!adjustmentEntries.ok) {
    return adjustmentEntries;
  }

  try {
    const updated = await accessRepository.closeDailyCashSessionWithBalances({
      clubId: validation.clubId,
      sessionId: validation.sessionId,
      closedByUserId: validation.userId,
      balances: buildSessionBalanceEntries(validation.drafts, "closing"),
      adjustments: adjustmentEntries.adjustments
    });

    if (!updated) {
      return { ok: false, code: "session_close_failed" };
    }

    return { ok: true, code: "session_closed" };
  } catch (error) {
    console.error("[close-session-atomic-write-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      sessionId: validation.sessionId,
      userId: validation.userId,
      operation: "close_daily_cash_session_with_balances",
      error
    });
    return { ok: false, code: "session_close_failed" };
  }
}

export async function getDashboardTreasuryCardForActiveClub(): Promise<DashboardTreasuryCard | null> {
  const context = await getAuthenticatedSessionContext();

  if (!context?.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    return null;
  }

  const clubId = context.activeClub.id;
  const sessionDate = getTodayDate();
  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;
  let sessionStateResolved = true;
  let movementDataResolved = true;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: clubId },
      user: { id: context.user.id }
    });
    session = await accessRepository.getDailyCashSessionByDate(clubId, sessionDate);
  } catch (error) {
    sessionStateResolved = false;
    console.error("[dashboard-session-state-resolution-failed]", {
      clubId,
      sessionDate,
      error
    });
  }

  const [accounts, categories, activities, calendarEvents] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId)
  ]);

  const secretaryAccounts = accounts.filter((account) => account.visibleForSecretaria);
  let historicalMovements: TreasuryMovement[] = [];
  let visibleMovements: TreasuryMovement[] = [];
  let shouldUseLegacyMovementFallback = false;

  try {
    historicalMovements = (await accessRepository.listTreasuryMovementsHistoryByAccounts(
      clubId,
      secretaryAccounts.map((account) => account.id)
    )).filter((movement) => shouldIncludeMovementInRoleBalances(movement, "secretaria"));
    visibleMovements = historicalMovements.filter(
      (movement) => secretaryAccounts.some((account) => account.id === movement.accountId) && movement.movementDate === sessionDate
    );
  } catch (error) {
    if (isMissingBulkMovementHistoryRpcError(error)) {
      shouldUseLegacyMovementFallback = true;
    } else {
      movementDataResolved = false;
      console.error("[dashboard-balance-data-resolution-failed]", {
        clubId,
        error
      });
    }
  }

  const visibleAccountIds = new Set(secretaryAccounts.map((account) => account.id));
  let balanceMovementsByAccount = new Map<string, TreasuryMovement[]>();

  if (!shouldUseLegacyMovementFallback) {
    balanceMovementsByAccount = new Map(
      secretaryAccounts.map((account) => [
        account.id,
        historicalMovements.filter((movement) => movement.accountId === account.id)
      ])
    );
  } else {
    try {
      const historicalMovementsByAccount = await Promise.all(
        secretaryAccounts.map(async (account) => [
          account.id,
          (await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)).filter((movement) =>
            shouldIncludeMovementInRoleBalances(movement, "secretaria")
          )
        ] as const)
      );

      balanceMovementsByAccount = new Map(historicalMovementsByAccount);

      const sameDayMovements = await accessRepository.listTreasuryMovementsByDateStrict(clubId, sessionDate);
      visibleMovements = sameDayMovements.filter((movement) => visibleAccountIds.has(movement.accountId));
    } catch (error) {
      movementDataResolved = false;
      console.error("[dashboard-movement-fallback-resolution-failed]", {
        clubId,
        sessionDate,
        error
      });
    }
  }

  const sessionUserIds = [session?.openedByUserId, session?.closedByUserId].filter((id): id is string => !!id);
  const users = await accessRepository.findUsersByIds(
    [...new Set([...visibleMovements.map((movement) => movement.createdByUserId), ...sessionUserIds])]
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(secretaryAccounts.map((account) => [account.id, account]));
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const calendarEventsById = new Map(calendarEvents.map((event) => [event.id, event]));

  return {
    sessionStatus: sessionStateResolved ? (session?.status ?? "not_started") : "unresolved",
    movementDataStatus: movementDataResolved ? "resolved" : "unresolved",
    sessionDate,
    sessionId: session?.id ?? null,
    sessionOpenedAt: session?.openedAt ?? null,
    sessionOpenedByUserName: session?.openedByUserId ? (usersById.get(session.openedByUserId)?.fullName ?? null) : null,
    sessionClosedAt: session?.closedAt ?? null,
    accounts: secretaryAccounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, balanceMovementsByAccount.get(account.id) ?? [])
    })),
    movements: visibleMovements
      .map((movement) =>
        buildDashboardMovementView({
          movement,
          accountsById,
          categoriesById,
          activitiesById,
          calendarEventsById,
          usersById,
          canEdit: session?.status === "open"
        })
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    availableActions:
      !sessionStateResolved
        ? []
        : session?.status === "open"
        ? ["close_session", "create_movement"]
        : session?.status === "closed"
          ? []
          : ["open_session"]
  };
}

export async function getTreasuryRoleDashboardForActiveClub(): Promise<TreasuryRoleDashboard | null> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return null;
  }

  const clubId = context.activeClub.id;
  const sessionDate = getTodayDate();
  const movementWindowStartDate = getRelativeDate(sessionDate, -4);
  const accounts = getAccountsVisibleForRole(await accessRepository.listTreasuryAccountsForClub(clubId), "tesoreria");
  const visibleAccountIds = new Set(accounts.map((account) => account.id));

  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: (await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)).filter(
        (movement) => shouldIncludeMovementInRoleBalances(movement, "tesoreria")
      )
    }))
  );

  const [categories, activities, calendarEvents] = await Promise.all([
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId)
  ]);
  let roleMovements: TreasuryMovement[] = [];
  let shouldUseLegacyMovementFallback = false;

  try {
    roleMovements = await accessRepository.listTreasuryMovementsHistoryByAccounts(
      clubId,
      accounts.map((account) => account.id)
    );
  } catch (error) {
    if (isMissingBulkMovementHistoryRpcError(error)) {
      shouldUseLegacyMovementFallback = true;
    } else {
      console.error("[treasury-role-dashboard-movement-resolution-failed]", {
        clubId,
        error
      });
      throw error;
    }
  }

  if (shouldUseLegacyMovementFallback) {
    try {
      roleMovements = (
        await Promise.all(
          accounts.map((account) => accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id))
        )
      ).flat();
    } catch (error) {
      console.error("[treasury-role-dashboard-movement-fallback-resolution-failed]", {
        clubId,
        error
      });
      throw error;
    }
  }

  const visibleRoleMovements = roleMovements
    .filter((movement) => visibleAccountIds.has(movement.accountId))
    .filter((movement) => shouldIncludeMovementInRoleBalances(movement, "tesoreria"))
    .filter((movement) =>
      isMovementWithinOperationalWindow(movement.movementDate, movementWindowStartDate, sessionDate)
    );
  const users = await accessRepository.findUsersByIds(
    [...new Set(visibleRoleMovements.map((movement) => movement.createdByUserId))]
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const calendarEventsById = new Map(calendarEvents.map((event) => [event.id, event]));
  const dashboardMovements = visibleRoleMovements
    .map((movement) =>
      buildDashboardMovementView({
        movement,
        accountsById,
        categoriesById,
        activitiesById,
        calendarEventsById,
        usersById,
        canEdit: isTreasuryRoleMovementEditable(movement)
      })
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  type DashboardMovementGroupEntries = Map<string, TreasuryDashboardMovement[]>;
  const movementGroups = Array.from(
    dashboardMovements.reduce((groups, movement) => {
      const dateGroup = groups.get(movement.movementDate) ?? new Map<string, TreasuryDashboardMovement[]>();
      const accountGroup = dateGroup.get(movement.accountId) ?? [];

      accountGroup.push(movement);
      dateGroup.set(movement.accountId, accountGroup);
      groups.set(movement.movementDate, dateGroup);

      return groups;
    }, new Map<string, DashboardMovementGroupEntries>()).entries()
  )
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([movementDate, accountGroups]) => ({
      movementDate,
      accounts: Array.from(accountGroups.entries())
        .map(([accountId, movements]) => ({
          accountId,
          accountName: accountsById.get(accountId)?.name ?? "",
          movements: [...movements].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        }))
        .sort((left, right) => left.accountName.localeCompare(right.accountName))
    }));

  return {
    sessionDate,
    accounts: movementsByAccount.map(({ account, movements }) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, movements)
    })),
    movementGroups,
    availableActions: ["create_movement", "create_fx_operation"]
  };
}

export async function createTreasuryMovement(input: {
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId: string;
  concept: string;
  currencyCode: string;
  amount: string;
}): Promise<TreasuryActionResultWithOptimisticUpdate> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: context.activeClub.id },
      user: { id: context.user.id }
    });
    session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());
  } catch (error) {
    console.error("[create-treasury-movement-session-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate: getTodayDate(),
      error
    });
    return { ok: false, code: "forbidden" };
  }

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_required" };
  }

  if (!input.accountId) {
    return { ok: false, code: "account_required" };
  }

  if (!input.movementType) {
    return { ok: false, code: "movement_type_required" };
  }

  if (!input.categoryId) {
    return { ok: false, code: "category_required" };
  }

  if (!input.concept.trim()) {
    return { ok: false, code: "concept_required" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  if (input.movementType !== "ingreso" && input.movementType !== "egreso") {
    return { ok: false, code: "movement_type_required" };
  }

  const [
    accounts,
    categories,
    activities,
    calendarEvents,
    configuredCurrencies,
    configuredMovementTypes
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id)
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForSecretaria
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForSecretaria
  );

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (input.movementType === "egreso") {
    const availableBalance = await getAvailableBalanceForAccountCurrency({
      clubId: context.activeClub.id,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: getTodayDate()
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForSecretaria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(context.activeClub.id, "secretaria");

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find(
          (entry) =>
            entry.id === input.calendarEventId &&
            entry.isEnabledForTreasury
        ) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const created = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, getTodayDate()),
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    originRole: "secretaria",
    originSource: "manual",
    accountId: account.id,
    movementType: input.movementType,
    categoryId: category.id,
    concept: input.concept.trim(),
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    activityId: activity?.id ?? null,
    receiptNumber: receiptNumber || null,
    calendarEventId: calendarEvent?.id ?? null,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!created) {
    return { ok: false, code: "movement_create_failed" };
  }

  const optimisticUsersById = new Map([[context.user.id, context.user]]);
  const optimisticAccountsById = new Map(accounts.map((entry) => [entry.id, entry]));
  const optimisticCategoriesById = new Map(categories.map((entry) => [entry.id, entry]));
  const optimisticActivitiesById = new Map(activities.map((entry) => [entry.id, entry]));
  const optimisticCalendarEventsById = new Map(calendarEvents.map((entry) => [entry.id, entry]));

  return {
    ok: true,
    code: "movement_created",
    movementDisplayId: created.displayId,
    optimisticUpdate: {
      movement: buildDashboardMovementView({
        movement: created,
        accountsById: optimisticAccountsById,
        categoriesById: optimisticCategoriesById,
        activitiesById: optimisticActivitiesById,
        calendarEventsById: optimisticCalendarEventsById,
        usersById: optimisticUsersById,
        canEdit: true
      }),
      balanceDelta: {
        accountId: created.accountId,
        currencyCode: created.currencyCode,
        amountDelta: buildMovementSignedAmount(created.movementType, created.amount)
      }
    }
  };
}

export async function updateSecretariaMovementInOpenSession(input: {
  movementId: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId: string;
  concept: string;
  currencyCode: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: context.activeClub.id },
      user: { id: context.user.id }
    });
    session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());
  } catch (error) {
    console.error("[update-secretaria-movement-session-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate: getTodayDate(),
      error
    });
    return { ok: false, code: "forbidden" };
  }

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_required" };
  }

  const movement = await accessRepository.findTreasuryMovementById(context.activeClub.id, input.movementId);

  if (
    !movement ||
    movement.clubId !== context.activeClub.id ||
    movement.dailyCashSessionId !== session.id
  ) {
    return { ok: false, code: "movement_not_editable" };
  }

  if (!input.accountId) {
    return { ok: false, code: "account_required" };
  }

  if (!input.movementType) {
    return { ok: false, code: "movement_type_required" };
  }

  if (!input.categoryId) {
    return { ok: false, code: "category_required" };
  }

  if (!input.concept.trim()) {
    return { ok: false, code: "concept_required" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  if (input.movementType !== "ingreso" && input.movementType !== "egreso") {
    return { ok: false, code: "movement_type_required" };
  }

  const [
    accounts,
    categories,
    activities,
    calendarEvents,
    configuredCurrencies,
    configuredMovementTypes
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id)
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) => movementType.movementType === input.movementType && movementType.isEnabled
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find((entry) => entry.id === input.accountId && entry.visibleForSecretaria);

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find((entry) => entry.id === input.categoryId && entry.visibleForSecretaria);

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (input.movementType === "egreso") {
    const availableBalance = await getAvailableBalanceForAccountCurrency({
      clubId: context.activeClub.id,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: movement.movementDate,
      excludeMovementId: movement.id
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForSecretaria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(context.activeClub.id, "secretaria");

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find((entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const beforeSnapshot = serializeMovementSnapshot(movement);

  try {
    const updatedMovement = await accessRepository.updateTreasuryMovement({
      movementId: movement.id,
      clubId: context.activeClub.id,
      accountId: account.id,
      movementType: input.movementType,
      categoryId: category.id,
      activityId: activity?.id ?? null,
      receiptNumber: receiptNumber || null,
      calendarEventId: calendarEvent?.id ?? null,
      concept: input.concept.trim(),
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    await accessRepository.createMovementAuditLog({
      clubId: context.activeClub.id,
      movementId: updatedMovement.id,
      actionType: "edited",
      payloadBefore: beforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedMovement),
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        { clubId: context.activeClub.id, movementId: movement.id, accountId: account.id },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}

export async function createAccountTransfer(input: {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  amount: string;
  concept: string;
}): Promise<TreasuryActionResult> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: context.activeClub.id },
      user: { id: context.user.id }
    });
    session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());
  } catch (error) {
    console.error("[create-account-transfer-session-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate: getTodayDate(),
      error
    });
    return { ok: false, code: "forbidden" };
  }

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_required" };
  }

  if (!input.sourceAccountId) {
    return { ok: false, code: "source_account_required" };
  }

  if (!input.targetAccountId) {
    return { ok: false, code: "target_account_required" };
  }

  if (input.sourceAccountId === input.targetAccountId) {
    return { ok: false, code: "accounts_must_be_distinct" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const allAccounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const sourceAccount = getAccountsVisibleForRole(allAccounts, "secretaria").find(
    (account) => account.id === input.sourceAccountId
  );
  const targetAccount = getTransferTargetAccountsForSecretaria(allAccounts).find(
    (account) => account.id === input.targetAccountId
  );

  if (!sourceAccount || !targetAccount) {
    return { ok: false, code: "invalid_transfer" };
  }

  if (
    !sourceAccount.currencies.includes(input.currencyCode) ||
    !targetAccount.currencies.includes(input.currencyCode)
  ) {
    return { ok: false, code: "invalid_transfer" };
  }

  const availableBalance = await getAvailableBalanceForAccountCurrency({
    clubId: context.activeClub.id,
    accountId: sourceAccount.id,
    currencyCode: input.currencyCode,
    effectiveDate: getTodayDate()
  });

  if (parsedAmount > availableBalance) {
    return { ok: false, code: "insufficient_funds" };
  }

  const concept = input.concept.trim() || texts.dashboard.treasury.transfer_default_concept;
  const [sourceMovementDisplayId, targetMovementDisplayId] = await generateMovementDisplayIds(
    context.activeClub.id,
    context.activeClub.name,
    getTodayDate(),
    2
  );
  const transfer = await accessRepository.createAccountTransfer({
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    sourceAccountId: sourceAccount.id,
    targetAccountId: targetAccount.id,
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    concept,
    sourceMovementDisplayId,
    targetMovementDisplayId,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!transfer) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "transfer_created", movementDisplayId: transfer.sourceMovementDisplayId };
}

export async function updateSecretariaTransferInOpenSession(input: {
  movementId: string;
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;

  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

  try {
    await reconcileStaleOpenDailyCashSessionForActiveClub({
      activeClub: { id: context.activeClub.id },
      user: { id: context.user.id }
    });
    session = await accessRepository.getDailyCashSessionByDate(clubId, getTodayDate());
  } catch (error) {
    console.error("[update-secretaria-transfer-session-resolution-failed]", { clubId, error });
    return { ok: false, code: "forbidden" };
  }

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_required" };
  }

  const movement = await accessRepository.findTreasuryMovementById(clubId, input.movementId);

  if (
    !movement ||
    movement.clubId !== clubId ||
    movement.dailyCashSessionId !== session.id ||
    !movement.transferGroupId
  ) {
    return { ok: false, code: "movement_not_editable" };
  }

  if (!input.sourceAccountId) return { ok: false, code: "source_account_required" };
  if (!input.targetAccountId) return { ok: false, code: "target_account_required" };
  if (input.sourceAccountId === input.targetAccountId) return { ok: false, code: "accounts_must_be_distinct" };
  if (!input.currencyCode) return { ok: false, code: "currency_required" };
  if (!input.amount) return { ok: false, code: "amount_required" };

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const relatedMovements = (
    await accessRepository.listTreasuryMovementsByDate(clubId, movement.movementDate)
  ).filter((entry) => entry.transferGroupId === movement.transferGroupId);

  const sourceMovement = relatedMovements.find((entry) => entry.movementType === "egreso") ?? null;
  const targetMovement = relatedMovements.find((entry) => entry.movementType === "ingreso") ?? null;

  if (!sourceMovement || !targetMovement) {
    return { ok: false, code: "invalid_transfer" };
  }

  const allAccounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  const sourceAccount = getAccountsVisibleForRole(allAccounts, "secretaria").find(
    (account) => account.id === input.sourceAccountId
  );
  const targetAccount = getTransferTargetAccountsForSecretaria(allAccounts).find(
    (account) => account.id === input.targetAccountId
  );

  if (!sourceAccount || !targetAccount) {
    return { ok: false, code: "invalid_transfer" };
  }

  if (
    !sourceAccount.currencies.includes(input.currencyCode) ||
    !targetAccount.currencies.includes(input.currencyCode)
  ) {
    return { ok: false, code: "invalid_transfer" };
  }

  const configuredCurrencies = await getConfiguredTreasuryCurrencies(clubId);

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  const availableBalance = await getAvailableBalanceForAccountCurrency({
    clubId,
    accountId: sourceAccount.id,
    currencyCode: input.currencyCode,
    effectiveDate: movement.movementDate,
    excludeMovementId: sourceMovement.id
  });

  if (parsedAmount > availableBalance) {
    return { ok: false, code: "insufficient_funds" };
  }

  const concept = input.concept.trim() || texts.dashboard.treasury.transfer_default_concept;
  const sourceBeforeSnapshot = serializeMovementSnapshot(sourceMovement);
  const targetBeforeSnapshot = serializeMovementSnapshot(targetMovement);

  try {
    const updatedSourceMovement = await accessRepository.updateTreasuryMovement({
      movementId: sourceMovement.id,
      clubId,
      accountId: sourceAccount.id,
      movementType: "egreso",
      categoryId: sourceMovement.categoryId || null,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      concept,
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedSourceMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    const updatedTargetMovement = await accessRepository.updateTreasuryMovement({
      movementId: targetMovement.id,
      clubId,
      accountId: targetAccount.id,
      movementType: "ingreso",
      categoryId: targetMovement.categoryId || null,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      concept,
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedTargetMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedSourceMovement.id,
      actionType: "edited",
      payloadBefore: sourceBeforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedSourceMovement),
      performedByUserId: context.user.id
    });

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedTargetMovement.id,
      actionType: "edited",
      payloadBefore: targetBeforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedTargetMovement),
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        {
          clubId,
          sourceMovementId: sourceMovement.id,
          targetMovementId: targetMovement.id,
          sourceAccountId: sourceAccount.id,
          targetAccountId: targetAccount.id
        },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}

export async function createFxOperation(input: {
  sourceAccountId: string;
  sourceCurrencyCode: string;
  sourceAmount: string;
  targetAccountId: string;
  targetCurrencyCode: string;
  targetAmount: string;
  concept: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  if (!input.sourceAccountId) {
    return { ok: false, code: "source_account_required" };
  }

  if (!input.targetAccountId) {
    return { ok: false, code: "target_account_required" };
  }

  if (!input.sourceCurrencyCode) {
    return { ok: false, code: "source_currency_required" };
  }

  if (!input.targetCurrencyCode) {
    return { ok: false, code: "target_currency_required" };
  }

  if (input.sourceCurrencyCode === input.targetCurrencyCode) {
    return { ok: false, code: "currencies_must_be_distinct" };
  }

  if (!input.sourceAmount) {
    return { ok: false, code: "source_amount_required" };
  }

  if (!input.targetAmount) {
    return { ok: false, code: "target_amount_required" };
  }

  const parsedSourceAmount = parseLocalizedAmount(input.sourceAmount);
  const parsedTargetAmount = parseLocalizedAmount(input.targetAmount);

  if (
    parsedSourceAmount === null ||
    parsedTargetAmount === null ||
    parsedSourceAmount <= 0 ||
    parsedTargetAmount <= 0
  ) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const accounts = await getTesoreriaAccounts(context.activeClub.id);
  const sourceAccount = accounts.find((account) => account.id === input.sourceAccountId);
  const targetAccount = accounts.find((account) => account.id === input.targetAccountId);

  if (!sourceAccount || !targetAccount) {
    return { ok: false, code: "invalid_fx_operation" };
  }

  if (
    !sourceAccount.currencies.includes(input.sourceCurrencyCode) ||
    !targetAccount.currencies.includes(input.targetCurrencyCode)
  ) {
    return { ok: false, code: "invalid_fx_operation" };
  }

  const availableBalance = await getAvailableBalanceForAccountCurrency({
    clubId: context.activeClub.id,
    accountId: sourceAccount.id,
    currencyCode: input.sourceCurrencyCode,
    effectiveDate: getTodayDate(),
    role: "tesoreria"
  });

  if (parsedSourceAmount > availableBalance) {
    return { ok: false, code: "insufficient_funds" };
  }

  const concept = input.concept.trim() || texts.dashboard.treasury.fx_default_concept;
  const operation = await accessRepository.createFxOperation({
    clubId: context.activeClub.id,
    sourceAccountId: sourceAccount.id,
    targetAccountId: targetAccount.id,
    sourceCurrencyCode: input.sourceCurrencyCode,
    targetCurrencyCode: input.targetCurrencyCode,
    sourceAmount: parsedSourceAmount,
    targetAmount: parsedTargetAmount,
    concept
  });

  if (!operation) {
    return { ok: false, code: "unknown_error" };
  }

  const sourceMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, getTodayDate()),
    clubId: context.activeClub.id,
    dailyCashSessionId: null,
    originRole: "tesoreria",
    originSource: "fx",
    accountId: sourceAccount.id,
    movementType: "egreso",
    categoryId: null,
    concept,
    currencyCode: input.sourceCurrencyCode,
    amount: parsedSourceAmount,
    fxOperationGroupId: operation.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id,
    status: "posted"
  });

  if (!sourceMovement) {
    return { ok: false, code: "unknown_error" };
  }

  const targetMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, getTodayDate()),
    clubId: context.activeClub.id,
    dailyCashSessionId: null,
    originRole: "tesoreria",
    originSource: "fx",
    accountId: targetAccount.id,
    movementType: "ingreso",
    categoryId: null,
    concept,
    currencyCode: input.targetCurrencyCode,
    amount: parsedTargetAmount,
    fxOperationGroupId: operation.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id,
    status: "posted"
  });

  if (!targetMovement) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "fx_operation_created" };
}

export async function createTreasuryRoleMovement(input: {
  movementDate: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId: string;
  concept: string;
  currencyCode: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  if (!input.accountId) {
    return { ok: false, code: "account_required" };
  }

  if (!input.movementType) {
    return { ok: false, code: "movement_type_required" };
  }

  if (!input.categoryId) {
    return { ok: false, code: "category_required" };
  }

  if (!input.concept.trim()) {
    return { ok: false, code: "concept_required" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const movementDate = input.movementDate.trim() || getTodayDate();
  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  if (input.movementType !== "ingreso" && input.movementType !== "egreso") {
    return { ok: false, code: "movement_type_required" };
  }

  const [accounts, categories, activities, calendarEvents, configuredCurrencies, configuredMovementTypes] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id)
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForTesoreria
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForTesoreria
  );

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (input.movementType === "egreso") {
    const availableBalance = await getAvailableBalanceForAccountCurrency({
      clubId: context.activeClub.id,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: movementDate,
      role: "tesoreria"
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForTesoreria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(context.activeClub.id, "tesoreria");

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find((entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const created = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, movementDate),
    clubId: context.activeClub.id,
    dailyCashSessionId: null,
    originRole: "tesoreria",
    originSource: "manual",
    accountId: account.id,
    movementType: input.movementType,
    categoryId: category.id,
    concept: input.concept.trim(),
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    activityId: activity?.id ?? null,
    receiptNumber: receiptNumber || null,
    calendarEventId: calendarEvent?.id ?? null,
    movementDate,
    createdByUserId: context.user.id,
    status: "posted"
  });

  if (!created) {
    return { ok: false, code: "movement_create_failed" };
  }

  return { ok: true, code: "movement_created", movementDisplayId: created.displayId };
}

export async function updateTreasuryRoleMovement(input: {
  movementId: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId: string;
  concept: string;
  currencyCode: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const movement = await accessRepository.findTreasuryMovementById(clubId, input.movementId);

  if (!movement || movement.clubId !== clubId || !isTreasuryRoleMovementEditable(movement)) {
    return { ok: false, code: "movement_not_editable" };
  }

  if (!input.accountId) {
    return { ok: false, code: "account_required" };
  }

  if (!input.movementType) {
    return { ok: false, code: "movement_type_required" };
  }

  if (!input.categoryId) {
    return { ok: false, code: "category_required" };
  }

  if (!input.concept.trim()) {
    return { ok: false, code: "concept_required" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  if (input.movementType !== "ingreso" && input.movementType !== "egreso") {
    return { ok: false, code: "movement_type_required" };
  }

  const [accounts, categories, activities, calendarEvents, configuredCurrencies, configuredMovementTypes] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
    getConfiguredTreasuryCurrencies(clubId),
    getConfiguredMovementTypes(clubId)
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) => movementType.movementType === input.movementType && movementType.isEnabled
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find((entry) => entry.id === input.accountId && entry.visibleForTesoreria);

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find((entry) => entry.id === input.categoryId && entry.visibleForTesoreria);

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (input.movementType === "egreso") {
    const availableBalance = await getAvailableBalanceForAccountCurrency({
      clubId,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: movement.movementDate,
      excludeMovementId: movement.id,
      role: "tesoreria"
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForTesoreria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(clubId, "tesoreria");

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find((entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const beforeSnapshot = serializeMovementSnapshot(movement);

  try {
    const updatedMovement = await accessRepository.updateTreasuryMovement({
      movementId: movement.id,
      clubId,
      accountId: account.id,
      movementType: input.movementType,
      categoryId: category.id,
      activityId: activity?.id ?? null,
      receiptNumber: receiptNumber || null,
      calendarEventId: calendarEvent?.id ?? null,
      concept: input.concept.trim(),
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedMovement.id,
      actionType: "edited",
      payloadBefore: beforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedMovement),
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        { clubId, movementId: movement.id, accountId: account.id },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}

async function buildMovementUserName(userId: string) {
  const user = await accessRepository.findUserById(userId);
  return user?.fullName ?? userId;
}

async function getConsolidationValidationIssues(
  movement: TreasuryMovement,
  clubId: string
) {
  const [accounts, categories, configuredCurrencies] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    getConfiguredTreasuryCurrencies(clubId)
  ]);

  const issues: string[] = [];
  const account = accounts.find((entry) => entry.id === movement.accountId && entry.clubId === clubId);
  const category = categories.find((entry) => entry.id === movement.categoryId && entry.clubId === clubId);

  if (!account || !account.visibleForTesoreria) {
    issues.push("invalid_account");
  }

  if (!movement.transferGroupId && (!category || !category.visibleForTesoreria)) {
    issues.push("invalid_category");
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === movement.currencyCode)) {
    issues.push("invalid_currency");
  }

  if (account && !account.currencies.includes(movement.currencyCode)) {
    issues.push("invalid_currency");
  }

  if (!movement.concept.trim()) {
    issues.push("concept_required");
  }

  if (movement.amount <= 0) {
    issues.push("amount_must_be_positive");
  }

  return [...new Set(issues)];
}

async function buildConsolidationMovement(
  movement: TreasuryMovement,
  clubId: string,
  postedMovements: TreasuryMovement[],
  integratedMovementIds: Set<string>
): Promise<ConsolidationMovement> {
  const [accounts, categories, activities, calendarEvents, createdByUserName, validationIssues] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
    buildMovementUserName(movement.createdByUserId),
    getConsolidationValidationIssues(movement, clubId)
  ]);

  const accountName = accounts.find((entry) => entry.id === movement.accountId)?.name ?? movement.accountId;
  const categoryName = categories.find((entry) => entry.id === movement.categoryId)?.name ?? movement.categoryId;
  const activityName = movement.activityId
    ? activities.find((entry) => entry.id === movement.activityId)?.name ?? null
    : null;
  const calendarEventTitle = movement.calendarEventId
    ? calendarEvents.find((entry) => entry.id === movement.calendarEventId)?.title ?? null
    : null;
  const possibleMatchMovement =
    movement.status === "pending_consolidation"
      ? postedMovements.find(
          (candidate) =>
            !integratedMovementIds.has(candidate.id) &&
            candidate.id !== movement.id &&
            candidate.accountId === movement.accountId &&
            candidate.currencyCode === movement.currencyCode &&
            candidate.amount === movement.amount
        ) ?? null
      : null;

  const possibleMatch = possibleMatchMovement
    ? {
        tesoreriaMovementId: possibleMatchMovement.id,
        movementDate: possibleMatchMovement.movementDate,
        accountName,
        movementType: possibleMatchMovement.movementType,
        categoryName:
          categories.find((entry) => entry.id === possibleMatchMovement.categoryId)?.name ??
          possibleMatchMovement.categoryId,
        concept: possibleMatchMovement.concept,
        currencyCode: possibleMatchMovement.currencyCode,
        amount: possibleMatchMovement.amount,
        createdByUserName: await buildMovementUserName(possibleMatchMovement.createdByUserId),
        createdAt: possibleMatchMovement.createdAt
      }
    : null;

  return {
    movementId: movement.id,
    movementDisplayId: movement.displayId,
    status:
      movement.status === "integrated" ? "integrated" : "pending_consolidation",
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    accountName,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    categoryName,
    activityId: movement.activityId ?? null,
    activityName,
    receiptNumber: movement.receiptNumber ?? null,
    calendarEventId: movement.calendarEventId ?? null,
    calendarEventTitle,
    transferReference: movement.transferGroupId ?? null,
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: movement.amount,
    createdByUserId: movement.createdByUserId,
    createdByUserName,
    createdAt: movement.createdAt,
    isValid: validationIssues.length === 0,
    validationIssues,
    possibleMatch
  };
}

export async function getTreasuryConsolidationDashboard(
  consolidationDate?: string
): Promise<TreasuryConsolidationDashboard | null> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return null;
  }

  const clubId = context.activeClub.id;
  const selectedDate = consolidationDate?.trim() || getDefaultConsolidationDate();
  const [movements, integrations] = await Promise.all([
    accessRepository.listTreasuryMovementsByDate(clubId, selectedDate),
    accessRepository.listMovementIntegrations()
  ]);
  let batch: TreasuryConsolidationDashboard["batch"] = null;

  try {
    batch = await accessRepository.getDailyConsolidationBatchByDate(clubId, selectedDate);
  } catch (error) {
    resolveConsolidationInfrastructureFailure(
      "get_treasury_consolidation_dashboard_batch",
      { clubId, consolidationDate: selectedDate },
      error
    );
  }

  const integratedMovementIds = new Set(integrations.map((entry) => entry.tesoreriaMovementId));
  const postedMovements = movements.filter((movement) => movement.status === "posted");
  const relevantMovements = movements.filter(
    (movement) => movement.status === "pending_consolidation" || movement.status === "integrated"
  );
  const mapped = await Promise.all(
    relevantMovements.map((movement) =>
      buildConsolidationMovement(movement, clubId, postedMovements, integratedMovementIds)
    )
  );

  return {
    consolidationDate: selectedDate,
    defaultDate: getDefaultConsolidationDate(),
    hasLoadedDate: Boolean(consolidationDate?.trim()),
    batch,
    pendingMovements: mapped.filter((movement) => movement.status === "pending_consolidation"),
    integratedMovements: mapped.filter((movement) => movement.status === "integrated")
  };
}

export async function getMovementAuditEntries(
  movementId: string
): Promise<ConsolidationAuditEntry[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  const movement = await accessRepository.findTreasuryMovementById(context.activeClub.id, movementId);

  if (!movement) {
    return [];
  }

  const createdByUserName = await buildMovementUserName(movement.createdByUserId);
  let logs: Awaited<ReturnType<typeof accessRepository.listMovementAuditLogsByMovementId>> = [];

  try {
    logs = await accessRepository.listMovementAuditLogsByMovementId({
      clubId: context.activeClub.id,
      movementId
    });
  } catch (error) {
    resolveConsolidationInfrastructureFailure(
      "get_movement_audit_entries",
      { clubId: context.activeClub.id, movementId },
      error
    );
  }

  const mappedLogs = await Promise.all(
    logs.map(async (log) => ({
      id: log.id,
      actionType: log.actionType,
      performedAt: log.performedAt,
      performedByUserName: await buildMovementUserName(log.performedByUserId),
      payloadBefore: log.payloadBefore,
      payloadAfter: log.payloadAfter
    }))
  );

  return [
    {
      id: `movement-audit-original-${movement.id}`,
      actionType: "original" as const,
      performedAt: movement.createdAt,
      performedByUserName: createdByUserName,
      payloadBefore: null,
      payloadAfter: serializeMovementSnapshot(movement)
    },
    ...mappedLogs
  ].sort((left, right) => left.performedAt.localeCompare(right.performedAt));
}

export async function updateMovementBeforeConsolidation(input: {
  movementId: string;
  movementDate: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId: string;
  concept: string;
  currencyCode: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const movement = await accessRepository.findTreasuryMovementById(clubId, input.movementId);

  if (!movement || movement.clubId !== clubId || movement.status !== "pending_consolidation") {
    return { ok: false, code: "movement_not_found" };
  }

  if (!input.accountId) {
    return { ok: false, code: "account_required" };
  }

  if (!input.movementDate.trim()) {
    return { ok: false, code: "movement_date_required" };
  }

  if (!input.movementType) {
    return { ok: false, code: "movement_type_required" };
  }

  if (!input.categoryId) {
    return { ok: false, code: "category_required" };
  }

  if (!input.concept.trim()) {
    return { ok: false, code: "concept_required" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const movementDate = input.movementDate.trim();
  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  if (!isValidOperationalDate(movementDate)) {
    return { ok: false, code: "invalid_movement_date" };
  }

  if (input.movementType !== "ingreso" && input.movementType !== "egreso") {
    return { ok: false, code: "movement_type_required" };
  }

  const [accounts, categories, activities, calendarEvents, configuredCurrencies] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
    getConfiguredTreasuryCurrencies(clubId)
  ]);

  const account = accounts.find((entry) => entry.id === input.accountId && entry.visibleForTesoreria);
  const category = categories.find((entry) => entry.id === input.categoryId && entry.visibleForTesoreria);

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForTesoreria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(clubId, "tesoreria");

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find((entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  if (input.movementType === "egreso") {
    const availableBalance = await getAvailableBalanceForAccountCurrency({
      clubId,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: movementDate,
      excludeMovementId: movement.id,
      role: "tesoreria"
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const beforeSnapshot = serializeMovementSnapshot(movement);

  try {
    const updatedMovement = await accessRepository.updateTreasuryMovement({
      movementId: movement.id,
      clubId,
      movementDate,
      accountId: account.id,
      movementType: input.movementType,
      categoryId: category.id,
      activityId: activity?.id ?? null,
      receiptNumber: receiptNumber || null,
      calendarEventId: calendarEvent?.id ?? null,
      concept: input.concept.trim(),
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedMovement.id,
      actionType: "edited",
      payloadBefore: beforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedMovement),
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        { clubId, movementId: movement.id, accountId: account.id, movementDate },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}

export async function updateTransferBeforeConsolidation(input: {
  movementId: string;
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const movement = await accessRepository.findTreasuryMovementById(clubId, input.movementId);

  if (!movement || movement.clubId !== clubId || movement.status !== "pending_consolidation" || !movement.transferGroupId) {
    return { ok: false, code: "movement_not_found" };
  }

  if (!input.sourceAccountId) {
    return { ok: false, code: "source_account_required" };
  }

  if (!input.targetAccountId) {
    return { ok: false, code: "target_account_required" };
  }

  if (input.sourceAccountId === input.targetAccountId) {
    return { ok: false, code: "accounts_must_be_distinct" };
  }

  if (!input.currencyCode) {
    return { ok: false, code: "currency_required" };
  }

  if (!input.amount) {
    return { ok: false, code: "amount_required" };
  }

  const parsedAmount = parseLocalizedAmount(input.amount);

  if (parsedAmount === null || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const concept = input.concept.trim() || texts.dashboard.treasury.transfer_default_concept;
  const relatedMovements = (await accessRepository.listTreasuryMovementsByDate(clubId, movement.movementDate)).filter(
    (entry) => entry.transferGroupId === movement.transferGroupId
  );
  const sourceMovement =
    relatedMovements.find((entry) => entry.movementType === "egreso") ?? null;
  const targetMovement =
    relatedMovements.find((entry) => entry.movementType === "ingreso") ?? null;

  if (
    !sourceMovement ||
    !targetMovement ||
    sourceMovement.status !== "pending_consolidation" ||
    targetMovement.status !== "pending_consolidation"
  ) {
    return { ok: false, code: "invalid_transfer" };
  }

  const allAccounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  const sourceAccount = getAccountsVisibleForRole(allAccounts, "secretaria").find(
    (account) => account.id === input.sourceAccountId
  );
  const targetAccount = getTransferTargetAccountsForSecretaria(allAccounts).find(
    (account) => account.id === input.targetAccountId
  );

  if (!sourceAccount || !targetAccount) {
    return { ok: false, code: "invalid_transfer" };
  }

  if (
    !sourceAccount.currencies.includes(input.currencyCode) ||
    !targetAccount.currencies.includes(input.currencyCode)
  ) {
    return { ok: false, code: "invalid_transfer" };
  }

  const configuredCurrencies = await getConfiguredTreasuryCurrencies(clubId);

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  const availableBalance = await getAvailableBalanceForAccountCurrency({
    clubId,
    accountId: sourceAccount.id,
    currencyCode: input.currencyCode,
    effectiveDate: sourceMovement.movementDate,
    excludeMovementId: sourceMovement.id,
    role: "tesoreria"
  });

  if (parsedAmount > availableBalance) {
    return { ok: false, code: "insufficient_funds" };
  }

  const sourceBeforeSnapshot = serializeMovementSnapshot(sourceMovement);
  const targetBeforeSnapshot = serializeMovementSnapshot(targetMovement);

  try {
    const updatedSourceMovement = await accessRepository.updateTreasuryMovement({
      movementId: sourceMovement.id,
      clubId,
      movementDate: sourceMovement.movementDate,
      accountId: sourceAccount.id,
      movementType: "egreso",
      categoryId: sourceMovement.categoryId || null,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      concept,
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedSourceMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    const updatedTargetMovement = await accessRepository.updateTreasuryMovement({
      movementId: targetMovement.id,
      clubId,
      movementDate: targetMovement.movementDate,
      accountId: targetAccount.id,
      movementType: "ingreso",
      categoryId: targetMovement.categoryId || null,
      activityId: null,
      receiptNumber: null,
      calendarEventId: null,
      concept,
      currencyCode: input.currencyCode,
      amount: parsedAmount
    });

    if (!updatedTargetMovement) {
      return { ok: false, code: "movement_update_failed" };
    }

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedSourceMovement.id,
      actionType: "edited",
      payloadBefore: sourceBeforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedSourceMovement),
      performedByUserId: context.user.id
    });

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedTargetMovement.id,
      actionType: "edited",
      payloadBefore: targetBeforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedTargetMovement),
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        {
          clubId,
          sourceMovementId: sourceMovement.id,
          targetMovementId: targetMovement.id,
          sourceAccountId: sourceAccount.id,
          targetAccountId: targetAccount.id
        },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}

export async function integrateMatchingMovement(input: {
  secretariaMovementId: string;
  tesoreriaMovementId: string;
}): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const [secretariaMovement, tesoreriaMovement, integrations] = await Promise.all([
    accessRepository.findTreasuryMovementById(clubId, input.secretariaMovementId),
    accessRepository.findTreasuryMovementById(clubId, input.tesoreriaMovementId),
    accessRepository.listMovementIntegrations()
  ]);

  if (
    !secretariaMovement ||
    !tesoreriaMovement ||
    secretariaMovement.clubId !== clubId ||
    tesoreriaMovement.clubId !== clubId ||
    secretariaMovement.status !== "pending_consolidation" ||
    tesoreriaMovement.status !== "posted"
  ) {
    return { ok: false, code: "invalid_match" };
  }

  if (
    secretariaMovement.accountId !== tesoreriaMovement.accountId ||
    secretariaMovement.currencyCode !== tesoreriaMovement.currencyCode ||
    secretariaMovement.amount !== tesoreriaMovement.amount
  ) {
    return { ok: false, code: "invalid_match" };
  }

  if (
    integrations.some(
      (entry) =>
        entry.secretariaMovementId === secretariaMovement.id || entry.tesoreriaMovementId === tesoreriaMovement.id
    )
  ) {
    return { ok: false, code: "invalid_match" };
  }

  const beforeSnapshot = serializeMovementSnapshot(secretariaMovement);
  const integration = await accessRepository.createMovementIntegration({
    secretariaMovementId: secretariaMovement.id,
    tesoreriaMovementId: tesoreriaMovement.id
  });

  if (!integration) {
    return { ok: false, code: "unknown_error" };
  }

  try {
    const updatedMovement = await accessRepository.updateTreasuryMovement({
      movementId: secretariaMovement.id,
      clubId,
      accountId: secretariaMovement.accountId,
      movementType: secretariaMovement.movementType,
      categoryId: secretariaMovement.categoryId,
      concept: secretariaMovement.concept,
      currencyCode: secretariaMovement.currencyCode,
      amount: secretariaMovement.amount,
      status: "integrated"
    });

    if (!updatedMovement) {
      return { ok: false, code: "unknown_error" };
    }

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedMovement.id,
      actionType: "integrated",
      payloadBefore: beforeSnapshot,
      payloadAfter: {
        ...serializeMovementSnapshot(updatedMovement),
        tesoreriaMovementId: tesoreriaMovement.id
      },
      performedByUserId: context.user.id
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "integrate_matching_movement",
        {
          clubId,
          secretariaMovementId: secretariaMovement.id,
          tesoreriaMovementId: tesoreriaMovement.id
        },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_integrated" };
}

export async function executeDailyConsolidation(
  consolidationDate: string
): Promise<TreasuryActionResult> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = context.activeClub.id;
  const selectedDate = consolidationDate.trim();

  if (!selectedDate) {
    return { ok: false, code: "consolidation_date_required" };
  }

  let existingBatch: Awaited<ReturnType<typeof accessRepository.getDailyConsolidationBatchByDate>>;

  try {
    existingBatch = await accessRepository.getDailyConsolidationBatchByDate(clubId, selectedDate);
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "get_daily_consolidation_batch_by_date",
        { clubId, consolidationDate: selectedDate },
        error
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  if (existingBatch?.status === "completed") {
    return { ok: false, code: "consolidation_already_completed" };
  }

  const movements = await accessRepository.listTreasuryMovementsByDate(clubId, selectedDate);
  const pendingMovements = movements.filter((movement) => movement.status === "pending_consolidation");

  const invalidMovementIds = (
    await Promise.all(
      pendingMovements.map(async (movement) => ({
        movementId: movement.id,
        issues: await getConsolidationValidationIssues(movement, clubId)
      }))
    )
  )
    .filter((entry) => entry.issues.length > 0)
    .map((entry) => entry.movementId);

  if (invalidMovementIds.length > 0) {
    return { ok: false, code: "consolidation_has_invalid_movements" };
  }

  let batch = existingBatch;

  if (!batch) {
    try {
      batch = await accessRepository.createDailyConsolidationBatch({
        clubId,
        consolidationDate: selectedDate,
        status: "pending",
        executedByUserId: context.user.id
      });
    } catch (error) {
      return (
        resolveConsolidationInfrastructureFailure(
          "create_daily_consolidation_batch",
          { clubId, consolidationDate: selectedDate },
          error
        ) ?? { ok: false, code: "unknown_error" }
      );
    }
  }

  if (!batch) {
    logTreasuryServiceFailure("create_daily_consolidation_batch", {
      clubId,
      consolidationDate: selectedDate
    });
    return { ok: false, code: "unknown_error" };
  }

  try {
    for (const movement of pendingMovements) {
      const beforeSnapshot = serializeMovementSnapshot(movement);
      const updatedMovement = await accessRepository.updateTreasuryMovement({
        movementId: movement.id,
        clubId,
        accountId: movement.accountId,
        movementType: movement.movementType,
        categoryId: movement.categoryId,
        concept: movement.concept,
        currencyCode: movement.currencyCode,
        amount: movement.amount,
        status: "consolidated",
        consolidationBatchId: batch.id
      });

      if (!updatedMovement) {
        logTreasuryServiceFailure("update_treasury_movement_during_consolidation", {
          clubId,
          consolidationDate: selectedDate,
          batchId: batch.id,
          movementId: movement.id,
          accountId: movement.accountId
        });
        throw new Error("consolidation_update_failed");
      }

      try {
        await accessRepository.createMovementAuditLog({
          clubId,
          movementId: updatedMovement.id,
          actionType: "consolidated",
          payloadBefore: beforeSnapshot,
          payloadAfter: {
            ...serializeMovementSnapshot(updatedMovement),
            consolidationBatchId: batch.id
          },
          performedByUserId: context.user.id
        });
      } catch (error) {
        const infrastructureFailure = resolveConsolidationInfrastructureFailure(
          "create_movement_audit_log",
          {
            clubId,
            consolidationDate: selectedDate,
            batchId: batch.id,
            movementId: updatedMovement.id
          },
          error
        );

        if (infrastructureFailure) {
          return infrastructureFailure;
        }

        throw error;
      }
    }

    try {
      await accessRepository.updateDailyConsolidationBatch({
        clubId,
        batchId: batch.id,
        status: "completed"
      });
    } catch (error) {
      return (
        resolveConsolidationInfrastructureFailure(
          "update_daily_consolidation_batch_completed",
          { clubId, consolidationDate: selectedDate, batchId: batch.id },
          error
        ) ?? { ok: false, code: "unknown_error" }
      );
    }
  } catch (error) {
    logTreasuryServiceFailure(
      "execute_daily_consolidation",
      {
        clubId,
        consolidationDate: selectedDate,
        batchId: batch.id,
        pendingMovementCount: pendingMovements.length
      },
      error
    );

    const infrastructureFailure = resolveConsolidationInfrastructureFailure(
      "execute_daily_consolidation",
      {
        clubId,
        consolidationDate: selectedDate,
        batchId: batch.id
      },
      error
    );

    try {
      await accessRepository.updateDailyConsolidationBatch({
        clubId,
        batchId: batch.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown_error"
      });
    } catch (updateError) {
      resolveConsolidationInfrastructureFailure(
        "update_daily_consolidation_batch_failed",
        { clubId, consolidationDate: selectedDate, batchId: batch.id },
        updateError
      );
    }

    return infrastructureFailure ?? { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "consolidation_completed" };
}

export async function getActiveActivitiesForSecretaria(): Promise<ClubActivity[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  const activities = await accessRepository.listClubActivitiesForClub(context.activeClub.id);
  return activities.filter((activity) => activity.visibleForSecretaria);
}

export async function getEnabledCalendarEventsForSecretaria(): Promise<ClubCalendarEvent[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  const events = await accessRepository.listClubCalendarEventsForClub(context.activeClub.id);
  return events.filter((event) => event.isEnabledForTreasury);
}

export async function getActiveActivitiesForTesoreria(): Promise<ClubActivity[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  const activities = await accessRepository.listClubActivitiesForClub(context.activeClub.id);
  return activities.filter((activity) => activity.visibleForTesoreria);
}

export async function getEnabledCalendarEventsForTesoreria(): Promise<ClubCalendarEvent[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  const events = await accessRepository.listClubCalendarEventsForClub(context.activeClub.id);
  return events.filter((event) => event.isEnabledForTreasury);
}

export async function getActiveTreasuryCurrenciesForSecretaria(): Promise<TreasuryCurrencyConfig[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  return getConfiguredTreasuryCurrencies(context.activeClub.id);
}

export async function getActiveTreasuryCurrenciesForTesoreria(): Promise<TreasuryCurrencyConfig[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  return getConfiguredTreasuryCurrencies(context.activeClub.id);
}

export async function getEnabledMovementTypesForSecretaria(): Promise<TreasuryMovementType[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  const movementTypes = await getConfiguredMovementTypes(context.activeClub.id);

  return movementTypes
    .filter((movementType) => movementType.isEnabled)
    .map((movementType) => movementType.movementType);
}

export async function getEnabledMovementTypesForTesoreria(): Promise<TreasuryMovementType[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  const movementTypes = await getConfiguredMovementTypes(context.activeClub.id);

  return movementTypes
    .filter((movementType) => movementType.isEnabled)
    .map((movementType) => movementType.movementType);
}

export async function getActiveReceiptFormatsForSecretaria(): Promise<ReceiptFormat[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  const formats = await accessRepository.listReceiptFormatsForClub(context.activeClub.id);
  return formats.filter((f) => f.status === "active" && f.visibleForSecretaria);
}

export async function getActiveReceiptFormatsForTesoreria(): Promise<ReceiptFormat[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  const formats = await accessRepository.listReceiptFormatsForClub(context.activeClub.id);
  return formats.filter((f) => f.status === "active" && f.visibleForTesoreria);
}

function validateReceiptNumberAgainstFormat(
  receiptNumber: string,
  receiptFormat: ReceiptFormat
) {
  if (receiptFormat.validationType === "numeric") {
    return /^[0-9]+$/.test(receiptNumber);
  }

  return /^[a-zA-Z0-9]+$/.test(receiptNumber);
}

export async function getTreasuryAccountDetailForActiveClub(
  accountId: string,
  role: TreasuryVisibilityRole = "secretaria"
): Promise<{
  accounts: Awaited<ReturnType<typeof accessRepository.listTreasuryAccountsForClub>>;
  detail: TreasuryAccountDetail | null;
} | null> {
  const context = role === "secretaria" ? await getSecretariaSession() : await getTesoreriaSession();

  if (!context?.activeClub) {
    return null;
  }

  if (role === "secretaria") {
    try {
      await reconcileStaleOpenDailyCashSessionForActiveClub({
        activeClub: { id: context.activeClub.id },
        user: { id: context.user.id }
      });
    } catch (error) {
      console.error("[account-detail-stale-session-reconciliation-failed]", {
        clubId: context.activeClub.id,
        sessionDate: getTodayDate(),
        error
      });
    }
  }

  const sessionDate = getTodayDate();
  const [accounts, categories, activities, calendarEvents, session] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate)
  ]);

  const visibleAccounts = getAccountsVisibleForRole(accounts, role);
  const selectedAccount = visibleAccounts.find((account) => account.id === accountId) ?? visibleAccounts[0] ?? null;

  if (!selectedAccount) {
    return {
      accounts: [],
      detail: null
    };
  }

  const movements = await accessRepository.listTreasuryMovementsHistoryByAccount(context.activeClub.id, selectedAccount.id);

  const visibleMovements = movements.filter((movement) => shouldIncludeMovementInRoleBalances(movement, role));
  const balances = buildAccountBalances(selectedAccount, visibleMovements);

  const detail: TreasuryAccountDetail = {
    account: {
      accountId: selectedAccount.id,
      name: selectedAccount.name
    },
    sessionStatus: session?.status ?? "not_started",
    balances,
    movements: visibleMovements
      .map((movement) => {
        const category = categories.find((entry) => entry.id === movement.categoryId);
        const activity = movement.activityId
          ? activities.find((entry) => entry.id === movement.activityId) ?? null
          : null;
        const calendarEvent = movement.calendarEventId
          ? calendarEvents.find((entry) => entry.id === movement.calendarEventId) ?? null
          : null;
        return {
          movementId: movement.id,
          movementDisplayId: movement.displayId,
          movementDate: movement.movementDate,
          movementType: movement.movementType,
          categoryName: category?.name ?? "",
          activityName: activity?.name ?? null,
          calendarEventTitle: calendarEvent?.title ?? null,
          transferReference: movement.transferGroupId ?? null,
          fxOperationReference: movement.fxOperationGroupId ?? null,
          concept: movement.concept,
          receiptNumber: movement.receiptNumber ?? null,
          currencyCode: movement.currencyCode,
          amount: movement.amount,
          createdByUserName: movement.createdByUserId === context.user.id ? context.user.fullName : movement.createdByUserId,
          createdAt: movement.createdAt
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  };

  return {
    accounts: visibleAccounts,
    detail
  };
}
