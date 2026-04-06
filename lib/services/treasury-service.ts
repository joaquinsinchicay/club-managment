import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { DashboardTreasuryCard, TreasuryAccountDetail } from "@/lib/domain/access";
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
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const sessionDate = getTodayDate();
  const existingSession = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate);

  if (existingSession) {
    return { ok: false, code: "session_already_exists" };
  }

  const created = await accessRepository.createDailyCashSession(
    context.activeClub.id,
    sessionDate,
    context.user.id
  );

  if (!created) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "session_opened" };
}

export async function closeDailyCashSession(): Promise<TreasuryActionResult> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const session = await accessRepository.getDailyCashSessionByDate(context.activeClub.id, getTodayDate());

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_not_open" };
  }

  const updated = await accessRepository.closeDailyCashSession(session.id, context.user.id);

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "session_closed" };
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
