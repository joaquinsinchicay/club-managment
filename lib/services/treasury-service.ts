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
  TreasuryRoleDashboard,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
  TreasuryAccountDetail,
  TreasuryConsolidationDashboard,
  TreasuryMovement,
  TreasuryMovementStatus
} from "@/lib/domain/access";
import { getDefaultReceiptFormats, isDefaultReceiptNumberValid } from "@/lib/receipt-formats";
import { accessRepository, isAccessRepositoryInfraError } from "@/lib/repositories/access-repository";
import { texts } from "@/lib/texts";

type TreasuryVisibilityRole = "secretaria" | "tesoreria";

type TreasuryActionCode =
  | "session_opened"
  | "session_closed"
  | "session_open_failed"
  | "session_close_failed"
  | "movement_created"
  | "movement_updated"
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
  | "source_currency_required"
  | "target_currency_required"
  | "currencies_must_be_distinct"
  | "source_amount_required"
  | "target_amount_required"
  | "invalid_fx_operation"
  | "movement_not_found"
  | "movement_not_editable"
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
  | "unknown_error";

export type TreasuryActionResult = {
  ok: boolean;
  code: TreasuryActionCode;
  movementDisplayId?: string;
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

async function generateMovementDisplayId(clubId: string, clubName: string, movementDate: string) {
  const year = movementDate.slice(0, 4);
  const prefix = buildClubInitials(clubName);
  const sequence = (await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year)) + 1;

  return `${prefix}-MOV-${year}-${sequence}`;
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

function shouldIncludeMovementInRoleBalances(
  movement: Pick<TreasuryMovement, "status">,
  role: TreasuryVisibilityRole
) {
  return (
    role === "secretaria" ||
    (movement.status !== "pending_consolidation" && movement.status !== "integrated")
  );
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
      movements: await accessRepository.listTreasuryMovementsByAccountStrict(clubId, account.id, sessionDate)
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

  const sessionDate = getTodayDate();
  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;
  let sessionStateResolved = true;
  let movementDataResolved = true;

  try {
    session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate);
  } catch (error) {
    sessionStateResolved = false;
    console.error("[dashboard-session-state-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate,
      error
    });
  }

  const [accounts, categories, activities, calendarEvents] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id)
  ]);

  const secretaryAccounts = accounts.filter((account) => account.visibleForSecretaria);
  let movements: TreasuryMovement[] = [];

  try {
    movements = await accessRepository.listTreasuryMovementsByDateStrict(context.activeClub.id, sessionDate);
  } catch (error) {
    movementDataResolved = false;
    console.error("[dashboard-movement-data-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate,
      error
    });
  }

  const visibleAccountIds = new Set(secretaryAccounts.map((account) => account.id));
  const visibleMovements = movements.filter((movement) => visibleAccountIds.has(movement.accountId));
  const users = await Promise.all(
    [...new Set(visibleMovements.map((movement) => movement.createdByUserId))].map(async (userId) => [
      userId,
      await accessRepository.findUserById(userId)
    ] as const)
  );
  const usersById = new Map(users);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(secretaryAccounts.map((account) => [account.id, account]));
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const calendarEventsById = new Map(calendarEvents.map((event) => [event.id, event]));

  return {
    sessionStatus: sessionStateResolved ? (session?.status ?? "not_started") : "unresolved",
    movementDataStatus: movementDataResolved ? "resolved" : "unresolved",
    sessionDate,
    sessionId: session?.id ?? null,
    accounts: secretaryAccounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, visibleMovements)
    })),
    movements: visibleMovements
      .map((movement) => ({
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
        canEdit: session?.status === "open"
      }))
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
  const accounts = getAccountsVisibleForRole(await accessRepository.listTreasuryAccountsForClub(clubId), "tesoreria");

  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: (await accessRepository.listTreasuryMovementsByAccount(clubId, account.id, sessionDate)).filter(
        (movement) => shouldIncludeMovementInRoleBalances(movement, "tesoreria")
      )
    }))
  );

  const [categories, roleMovements] = await Promise.all([
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listTreasuryMovementsByDate(clubId, sessionDate)
  ]);
  const visibleAccountIds = new Set(accounts.map((account) => account.id));
  const users = await Promise.all(
    [...new Set(roleMovements.map((movement) => movement.createdByUserId))].map(async (userId) => [
      userId,
      await accessRepository.findUserById(userId)
    ] as const)
  );
  const usersById = new Map(users);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  return {
    sessionDate,
    accounts: movementsByAccount.map(({ account, movements }) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, movements)
    })),
    movements: roleMovements
      .filter((movement) => movement.status === "posted" && visibleAccountIds.has(movement.accountId))
      .map((movement) => ({
        movementId: movement.id,
        movementDisplayId: movement.displayId,
        movementDate: movement.movementDate,
        accountId: movement.accountId,
        accountName: accountsById.get(movement.accountId)?.name ?? "",
        movementType: movement.movementType,
        categoryName:
          categoriesById.get(movement.categoryId)?.name ?? texts.dashboard.treasury.detail_uncategorized_category,
        concept: movement.concept,
        currencyCode: movement.currencyCode,
        amount: movement.amount,
        createdByUserName: usersById.get(movement.createdByUserId)?.fullName ?? "",
        createdAt: movement.createdAt
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    availableActions: ["create_movement", "create_fx_operation"]
  };
}

export async function openDailyCashSession(): Promise<TreasuryActionResult> {
  const base = await getSessionValidationBase("open");

  if (!base) {
    return { ok: false, code: "forbidden" };
  }

  return openDailyCashSessionWithDeclaredBalances(
    base.accounts.map((account) => ({
      accountId: account.accountId,
      currencyCode: account.currencyCode,
      declaredBalance: String(account.expectedBalance)
    }))
  );
}

export async function closeDailyCashSession(): Promise<TreasuryActionResult> {
  const base = await getSessionValidationBase("close");

  if (!base) {
    return { ok: false, code: "forbidden" };
  }

  return closeDailyCashSessionWithDeclaredBalances(
    base.accounts.map((account) => ({
      accountId: account.accountId,
      currencyCode: account.currencyCode,
      declaredBalance: String(account.expectedBalance)
    }))
  );
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
}): Promise<TreasuryActionResult> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());

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

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForSecretaria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = getDefaultReceiptFormats(context.activeClub.id);

  if (receiptNumber.length > 0 && activeReceiptFormats.length > 0) {
    const isValidReceipt = activeReceiptFormats.some((format) =>
      validateReceiptNumberAgainstFormat(receiptNumber, format)
    );

    if (!isValidReceipt) {
      return { ok: false, code: "invalid_receipt_format" };
    }
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
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "movement_created", movementDisplayId: created.displayId };
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

  const session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());

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

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForSecretaria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = getDefaultReceiptFormats(context.activeClub.id);

  if (receiptNumber.length > 0 && activeReceiptFormats.length > 0) {
    const isValidReceipt = activeReceiptFormats.some((format) =>
      validateReceiptNumberAgainstFormat(receiptNumber, format)
    );

    if (!isValidReceipt) {
      return { ok: false, code: "invalid_receipt_format" };
    }
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find((entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const beforeSnapshot = serializeMovementSnapshot(movement);
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
    return { ok: false, code: "unknown_error" };
  }

  await accessRepository.createMovementAuditLog({
    movementId: updatedMovement.id,
    actionType: "edited",
    payloadBefore: beforeSnapshot,
    payloadAfter: serializeMovementSnapshot(updatedMovement),
    performedByUserId: context.user.id
  });

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

  const session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());

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

  const concept = input.concept.trim() || texts.dashboard.treasury.transfer_default_concept;
  const transfer = await accessRepository.createAccountTransfer({
    clubId: context.activeClub.id,
    sourceAccountId: sourceAccount.id,
    targetAccountId: targetAccount.id,
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    concept
  });

  if (!transfer) {
    return { ok: false, code: "unknown_error" };
  }

  const sourceMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, getTodayDate()),
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    accountId: sourceAccount.id,
    movementType: "egreso",
    categoryId: "",
    concept,
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    transferGroupId: transfer.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!sourceMovement) {
    return { ok: false, code: "unknown_error" };
  }

  const targetMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, getTodayDate()),
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    accountId: targetAccount.id,
    movementType: "ingreso",
    categoryId: "",
    concept,
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    transferGroupId: transfer.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!targetMovement) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "transfer_created", movementDisplayId: sourceMovement.displayId };
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

  if (input.sourceAccountId === input.targetAccountId) {
    return { ok: false, code: "accounts_must_be_distinct" };
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
    accountId: sourceAccount.id,
    movementType: "egreso",
    categoryId: "",
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
    accountId: targetAccount.id,
    movementType: "ingreso",
    categoryId: "",
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

  const [accounts, categories, activities, configuredCurrencies, configuredMovementTypes] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
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

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.visibleForTesoreria) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = getDefaultReceiptFormats(context.activeClub.id);

  if (receiptNumber.length > 0 && activeReceiptFormats.length > 0) {
    const isValidReceipt = activeReceiptFormats.some((format) =>
      validateReceiptNumberAgainstFormat(receiptNumber, format)
    );

    if (!isValidReceipt) {
      return { ok: false, code: "invalid_receipt_format" };
    }
  }

  const created = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(context.activeClub.id, context.activeClub.name, movementDate),
    clubId: context.activeClub.id,
    dailyCashSessionId: null,
    accountId: account.id,
    movementType: input.movementType,
    categoryId: category.id,
    concept: input.concept.trim(),
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    activityId: activity?.id ?? null,
    receiptNumber: receiptNumber || null,
    movementDate,
    createdByUserId: context.user.id,
    status: "posted"
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "movement_created", movementDisplayId: created.displayId };
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

  if (!category || !category.visibleForTesoreria) {
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
  const [accounts, categories, createdByUserName, validationIssues] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    buildMovementUserName(movement.createdByUserId),
    getConsolidationValidationIssues(movement, clubId)
  ]);

  const accountName = accounts.find((entry) => entry.id === movement.accountId)?.name ?? movement.accountId;
  const categoryName = categories.find((entry) => entry.id === movement.categoryId)?.name ?? movement.categoryId;
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
  const [movements, batch, integrations] = await Promise.all([
    accessRepository.listTreasuryMovementsByDate(clubId, selectedDate),
    accessRepository.getDailyConsolidationBatchByDate(clubId, selectedDate),
    accessRepository.listMovementIntegrations()
  ]);

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

  const [createdByUserName, logs] = await Promise.all([
    buildMovementUserName(movement.createdByUserId),
    accessRepository.listMovementAuditLogsByMovementId(movementId)
  ]);

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
  accountId: string;
  movementType: string;
  categoryId: string;
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

  const [accounts, categories, configuredCurrencies] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
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

  const beforeSnapshot = serializeMovementSnapshot(movement);
  const updatedMovement = await accessRepository.updateTreasuryMovement({
    movementId: movement.id,
    clubId,
    accountId: account.id,
    movementType: input.movementType,
    categoryId: category.id,
    concept: input.concept.trim(),
    currencyCode: input.currencyCode,
    amount: parsedAmount
  });

  if (!updatedMovement) {
    return { ok: false, code: "unknown_error" };
  }

  await accessRepository.createMovementAuditLog({
    movementId: updatedMovement.id,
    actionType: "edited",
    payloadBefore: beforeSnapshot,
    payloadAfter: serializeMovementSnapshot(updatedMovement),
    performedByUserId: context.user.id
  });

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
    movementId: updatedMovement.id,
    actionType: "integrated",
    payloadBefore: beforeSnapshot,
    payloadAfter: {
      ...serializeMovementSnapshot(updatedMovement),
      tesoreriaMovementId: tesoreriaMovement.id
    },
    performedByUserId: context.user.id
  });

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

  const existingBatch = await accessRepository.getDailyConsolidationBatchByDate(
    clubId,
    selectedDate
  );

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

  const batch =
    existingBatch ??
    (await accessRepository.createDailyConsolidationBatch({
      clubId,
      consolidationDate: selectedDate,
      status: "pending",
      executedByUserId: context.user.id
    }));

  if (!batch) {
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
        throw new Error("consolidation_update_failed");
      }

      await accessRepository.createMovementAuditLog({
        movementId: updatedMovement.id,
        actionType: "consolidated",
        payloadBefore: beforeSnapshot,
        payloadAfter: {
          ...serializeMovementSnapshot(updatedMovement),
          consolidationBatchId: batch.id
        },
        performedByUserId: context.user.id
      });
    }

    await accessRepository.updateDailyConsolidationBatch({
      batchId: batch.id,
      status: "completed"
    });
  } catch (error) {
    await accessRepository.updateDailyConsolidationBatch({
      batchId: batch.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "unknown_error"
    });

    return { ok: false, code: "unknown_error" };
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

  return getDefaultReceiptFormats(context.activeClub.id);
}

export async function getActiveReceiptFormatsForTesoreria(): Promise<ReceiptFormat[]> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return [];
  }

  return getDefaultReceiptFormats(context.activeClub.id);
}

function validateReceiptNumberAgainstFormat(
  receiptNumber: string,
  receiptFormat: ReceiptFormat
) {
  if (receiptFormat.example === "PAY-SOC-26205") {
    return isDefaultReceiptNumberValid(receiptNumber);
  }

  if (!receiptFormat.pattern) {
    return false;
  }

  try {
    if (!new RegExp(receiptFormat.pattern).test(receiptNumber)) {
      return false;
    }

    if (receiptFormat.minNumericValue === null) {
      return true;
    }

    const parsedValue = Number(receiptNumber);
    return Number.isFinite(parsedValue) && parsedValue >= receiptFormat.minNumericValue;
  } catch {
    return false;
  }
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
