import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type {
  DailyCashSessionValidation,
  DashboardTreasuryCard,
  SessionBalanceDraft,
  TreasuryAccount,
  TreasuryAccountDetail
} from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";

type TreasuryActionCode =
  | "session_opened"
  | "session_closed"
  | "movement_created"
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
  | "invalid_currency"
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

  if (context.activeMembership.role !== "secretaria" || context.activeMembership.status !== "activo") {
    return null;
  }

  return context;
}

function buildMovementSignedAmount(movementType: "ingreso" | "egreso", amount: number) {
  return movementType === "ingreso" ? amount : amount * -1;
}

async function getSecretariaAccounts(clubId: string) {
  const accounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  return accounts.filter((account) => account.accountScope === "secretaria");
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

  if (context.activeMembership.role !== "secretaria" || context.activeMembership.status !== "activo") {
    return null;
  }

  const sessionDate = getTodayDate();
  const [session, accounts] = await Promise.all([
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate),
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id)
  ]);

  const secretaryAccounts = accounts.filter((account) => account.accountScope === "secretaria");
  const movements = session ? await accessRepository.listTreasuryMovementsBySession(session.id) : [];

  return {
    sessionStatus: session?.status ?? "not_started",
    sessionDate,
    sessionId: session?.id ?? null,
    accounts: secretaryAccounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      balances: account.currencies.map((currencyCode) => {
        const amount = movements
          .filter((movement) => movement.accountId === account.id && movement.currencyCode === currencyCode)
          .reduce((total, movement) => {
            const signedAmount = buildMovementSignedAmount(movement.movementType, movement.amount);
            return total + signedAmount;
          }, 0);

        return {
          currencyCode,
          amount
        };
      })
    })),
    availableActions:
      session?.status === "open"
        ? ["close_session", "create_movement"]
        : ["open_session"]
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

  const [accounts, categories] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id)
  ]);

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.accountScope === "secretaria"
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find((entry) => entry.id === input.categoryId);

  if (!category) {
    return { ok: false, code: "invalid_category" };
  }

  if (!account.currencies.includes(input.currencyCode)) {
    return { ok: false, code: "invalid_currency" };
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
    movementDate: getTodayDate(),
    createdByUserId: context.user.id
  });

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "movement_created" };
}

export async function getTreasuryAccountDetailForActiveClub(
  accountId: string
): Promise<{
  accounts: Awaited<ReturnType<typeof accessRepository.listTreasuryAccountsForClub>>;
  detail: TreasuryAccountDetail | null;
  canCreateMovement: boolean;
} | null> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return null;
  }

  const sessionDate = getTodayDate();
  const [accounts, categories, session] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate)
  ]);

  const secretariaAccounts = accounts.filter((account) => account.accountScope === "secretaria");
  const selectedAccount = secretariaAccounts.find((account) => account.id === accountId) ?? secretariaAccounts[0] ?? null;

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

  const balances = selectedAccount.currencies.map((currencyCode) => ({
    currencyCode,
    amount: movements
      .filter((movement) => movement.currencyCode === currencyCode)
      .reduce((total, movement) => total + buildMovementSignedAmount(movement.movementType, movement.amount), 0)
  }));

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
        return {
          movementId: movement.id,
          movementDate: movement.movementDate,
          movementType: movement.movementType,
          categoryName: category?.name ?? "Sin categoria",
          concept: movement.concept,
          currencyCode: movement.currencyCode,
          amount: movement.amount,
          createdByUserName: movement.createdByUserId === context.user.id ? context.user.fullName : movement.createdByUserId,
          createdAt: movement.createdAt
        };
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  };

  return {
    accounts: secretariaAccounts,
    detail,
    canCreateMovement: session?.status === "open"
  };
}
