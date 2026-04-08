import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import type {
  ClubActivity,
  ClubCalendarEvent,
  DailyCashSessionValidation,
  DashboardTreasuryCard,
  MovementTypeConfig,
  ReceiptFormat,
  SessionBalanceDraft,
  TreasuryAccount,
  TreasuryAdditionalFieldName,
  TreasuryRoleDashboard,
  TreasuryCurrencyConfig,
  TreasuryFieldRule,
  TreasuryMovementType,
  TreasuryAccountDetail
} from "@/lib/domain/access";
import { getDefaultReceiptFormats, isDefaultReceiptNumberValid } from "@/lib/receipt-formats";
import { accessRepository } from "@/lib/repositories/access-repository";
import { texts } from "@/lib/texts";

type TreasuryVisibilityRole = "secretaria" | "tesoreria";

type TreasuryActionCode =
  | "session_opened"
  | "session_closed"
  | "movement_created"
  | "transfer_created"
  | "fx_operation_created"
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
  | "activity_required"
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
  | "invalid_receipt_format"
  | "receipt_required"
  | "calendar_required"
  | "invalid_calendar_event"
  | "no_accounts_available"
  | "declared_balance_required"
  | "declared_balance_invalid"
  | "adjustment_category_missing"
  | "unknown_error";

export type TreasuryActionResult = {
  ok: boolean;
  code: TreasuryActionCode;
};

const TODAY = "2026-04-06";

function getTodayDate() {
  return TODAY;
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

async function getSecretariaAccounts(clubId: string) {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.visibleForSecretaria);
}

function getAccountsVisibleForRole(
  accounts: TreasuryAccount[],
  role: TreasuryVisibilityRole
) {
  return accounts.filter((account) =>
    role === "secretaria" ? account.visibleForSecretaria : account.visibleForTesoreria
  );
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

function buildFieldRulesMapForCategory(
  fieldRules: TreasuryFieldRule[],
  categoryId: string
) {
  return fieldRules
    .filter((rule) => rule.categoryId === categoryId)
    .reduce(
      (accumulator, rule) => {
        accumulator[rule.fieldName] = {
          isVisible: rule.isVisible,
          isRequired: rule.isRequired
        };

        return accumulator;
      },
      {} as Partial<
        Record<TreasuryAdditionalFieldName, { isVisible: boolean; isRequired: boolean }>
      >
    );
}

async function buildAccountBalanceDrafts(
  clubId: string,
  sessionDate: string,
  accounts: TreasuryAccount[]
): Promise<SessionBalanceDraft[]> {
  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: await accessRepository.listTreasuryMovementsByAccount(clubId, account.id, sessionDate)
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
  const [accounts, session] = await Promise.all([
    getSecretariaAccounts(context.activeClub.id),
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate)
  ]);

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

  return {
    clubId: context.activeClub.id,
    sessionDate,
    sessionStatus: session?.status ?? "not_started",
    sessionId: session?.id ?? null,
    accounts: await buildAccountBalanceDrafts(context.activeClub.id, sessionDate, accounts)
  };
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

    const parsed = Number(rawDeclared);

    if (!Number.isFinite(parsed)) {
      return { ok: false, code: "declared_balance_invalid" };
    }

    drafts.push(buildDraftFromDeclaredValue(draft, parsed));
  }

  return {
    ok: true,
    clubId: context.activeClub.id,
    userId: context.user.id,
    sessionDate: base.sessionDate,
    sessionId: base.sessionId,
    drafts
  };
}

async function applyBalanceAdjustments(input: {
  clubId: string;
  userId: string;
  sessionId: string;
  sessionDate: string;
  mode: "open" | "close";
  drafts: SessionBalanceDraft[];
}) {
  const adjustmentCategory = await accessRepository.findTreasuryAdjustmentCategory(input.clubId);

  if (!adjustmentCategory) {
    return { ok: false, code: "adjustment_category_missing" } as const;
  }

  for (const draft of input.drafts.filter((entry) => entry.differenceAmount !== 0 && entry.adjustmentType)) {
    const movement = await accessRepository.createTreasuryMovement({
      clubId: input.clubId,
      dailyCashSessionId: input.sessionId,
      accountId: draft.accountId,
      movementType: draft.adjustmentType!,
      categoryId: adjustmentCategory.id,
      concept: `${adjustmentCategory.name} ${input.mode === "open" ? "de apertura" : "de cierre"}`,
      currencyCode: draft.currencyCode,
      amount: Math.abs(draft.differenceAmount),
      movementDate: input.sessionDate,
      createdByUserId: input.userId
    });

    if (!movement) {
      return { ok: false, code: "unknown_error" } as const;
    }

    await accessRepository.recordBalanceAdjustment({
      sessionId: input.sessionId,
      movementId: movement.id,
      accountId: draft.accountId,
      differenceAmount: draft.differenceAmount,
      adjustmentMoment: input.mode === "open" ? "opening" : "closing"
    });
  }

  return { ok: true } as const;
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

  const createdSession = await accessRepository.createDailyCashSession(
    validation.clubId,
    validation.sessionDate,
    validation.userId
  );

  if (!createdSession) {
    return { ok: false, code: "unknown_error" };
  }

  await accessRepository.recordDailyCashSessionBalances(
    validation.drafts.map((draft) => ({
      sessionId: createdSession.id,
      accountId: draft.accountId,
      currencyCode: draft.currencyCode,
      balanceMoment: "opening",
      expectedBalance: draft.expectedBalance,
      declaredBalance: draft.declaredBalance,
      differenceAmount: draft.differenceAmount
    }))
  );

  const adjustmentResult = await applyBalanceAdjustments({
    clubId: validation.clubId,
    userId: validation.userId,
    sessionId: createdSession.id,
    sessionDate: validation.sessionDate,
    mode: "open",
    drafts: validation.drafts
  });

  if (!adjustmentResult.ok) {
    return adjustmentResult;
  }

  return { ok: true, code: "session_opened" };
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

  await accessRepository.recordDailyCashSessionBalances(
    validation.drafts.map((draft) => ({
      sessionId: validation.sessionId!,
      accountId: draft.accountId,
      currencyCode: draft.currencyCode,
      balanceMoment: "closing",
      expectedBalance: draft.expectedBalance,
      declaredBalance: draft.declaredBalance,
      differenceAmount: draft.differenceAmount
    }))
  );

  const adjustmentResult = await applyBalanceAdjustments({
    clubId: validation.clubId,
    userId: validation.userId,
    sessionId: validation.sessionId,
    sessionDate: validation.sessionDate,
    mode: "close",
    drafts: validation.drafts
  });

  if (!adjustmentResult.ok) {
    return adjustmentResult;
  }

  const updated = await accessRepository.closeDailyCashSession(validation.sessionId, validation.userId);

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "session_closed" };
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
  const [session, accounts] = await Promise.all([
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate),
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id)
  ]);

  const secretaryAccounts = accounts.filter((account) => account.visibleForSecretaria);
  const movements = session ? await accessRepository.listTreasuryMovementsBySession(session.id) : [];

  return {
    sessionStatus: session?.status ?? "not_started",
    sessionDate,
    sessionId: session?.id ?? null,
    accounts: secretaryAccounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, movements)
    })),
    availableActions:
      session?.status === "open"
        ? ["close_session", "create_movement"]
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
  const accounts = getAccountsVisibleForRole(
    await accessRepository.listTreasuryAccountsForClub(clubId),
    "tesoreria"
  );

  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: await accessRepository.listTreasuryMovementsByAccount(
        clubId,
        account.id,
        sessionDate
      )
    }))
  );

  return {
    sessionDate,
    accounts: movementsByAccount.map(({ account, movements }) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, movements)
    })),
    availableActions: ["create_movement"]
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

  const parsedAmount = Number(input.amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
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
    fieldRules,
    configuredCurrencies,
    configuredMovementTypes
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    accessRepository.listTreasuryFieldRulesForClub(context.activeClub.id),
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

  const category = categories.find((entry) => entry.id === input.categoryId);

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  const categoryFieldRules = buildFieldRulesMapForCategory(fieldRules, category.id);

  if (!configuredCurrencies.some((currency) => currency.currencyCode === input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find((entry) => entry.id === input.activityId && entry.status === "active") ?? null
      : null;

  if (categoryFieldRules.activity?.isRequired && !input.activityId.trim()) {
    return { ok: false, code: "activity_required" };
  }

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = getDefaultReceiptFormats(context.activeClub.id);

  if (categoryFieldRules.receipt?.isRequired && receiptNumber.length === 0) {
    return { ok: false, code: "receipt_required" };
  }

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

  if (categoryFieldRules.calendar?.isRequired && !input.calendarEventId.trim()) {
    return { ok: false, code: "calendar_required" };
  }

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const created = await accessRepository.createTreasuryMovement({
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

  return { ok: true, code: "movement_created" };
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

  const parsedAmount = Number(input.amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const accounts = await getSecretariaAccounts(context.activeClub.id);
  const sourceAccount = accounts.find((account) => account.id === input.sourceAccountId);
  const targetAccount = accounts.find((account) => account.id === input.targetAccountId);

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

  return { ok: true, code: "transfer_created" };
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

  const parsedSourceAmount = Number(input.sourceAmount);
  const parsedTargetAmount = Number(input.targetAmount);

  if (
    !Number.isFinite(parsedSourceAmount) ||
    !Number.isFinite(parsedTargetAmount) ||
    parsedSourceAmount <= 0 ||
    parsedTargetAmount <= 0
  ) {
    return { ok: false, code: "amount_must_be_positive" };
  }

  const accounts = await getSecretariaAccounts(context.activeClub.id);
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
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    accountId: sourceAccount.id,
    movementType: "egreso",
    categoryId: "",
    concept,
    currencyCode: input.sourceCurrencyCode,
    amount: parsedSourceAmount,
    fxOperationGroupId: operation.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!sourceMovement) {
    return { ok: false, code: "unknown_error" };
  }

  const targetMovement = await accessRepository.createTreasuryMovement({
    clubId: context.activeClub.id,
    dailyCashSessionId: session.id,
    accountId: targetAccount.id,
    movementType: "ingreso",
    categoryId: "",
    concept,
    currencyCode: input.targetCurrencyCode,
    amount: parsedTargetAmount,
    fxOperationGroupId: operation.id,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
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
  const parsedAmount = Number(input.amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
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
    (entry) => entry.id === input.categoryId && entry.visibleForTesoreria && entry.status === "active"
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
      ? activities.find((entry) => entry.id === input.activityId && entry.status === "active") ?? null
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
    clubId: context.activeClub.id,
    dailyCashSessionId: "",
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

  return { ok: true, code: "movement_created" };
}

export async function getActiveActivitiesForSecretaria(): Promise<ClubActivity[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  const activities = await accessRepository.listClubActivitiesForClub(context.activeClub.id);
  return activities.filter((activity) => activity.status === "active");
}

export async function getTreasuryFieldRulesForSecretaria(): Promise<TreasuryFieldRule[]> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  return accessRepository.listTreasuryFieldRulesForClub(context.activeClub.id);
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
  return activities.filter((activity) => activity.status === "active");
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
  canCreateMovement: boolean;
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
      detail: null,
      canCreateMovement: false
    };
  }

  const movements = await accessRepository.listTreasuryMovementsByAccount(
    context.activeClub.id,
    selectedAccount.id,
    sessionDate
  );

  const balances = buildAccountBalances(selectedAccount, movements);

  const detail: TreasuryAccountDetail = {
    account: {
      accountId: selectedAccount.id,
      name: selectedAccount.name
    },
    sessionStatus: session?.status ?? "not_started",
    balances,
    movements: movements
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
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  };

  return {
    accounts: visibleAccounts,
    detail,
    canCreateMovement: role === "secretaria" && session?.status === "open"
  };
}
