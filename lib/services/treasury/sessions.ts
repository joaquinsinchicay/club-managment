/**
 * lib/services/treasury/sessions.ts — lifecycle de la jornada de Secretaría
 * (apertura, cierre, validación, auto-close de sesiones quedadas abiertas).
 *
 * Modelo: una `daily_cash_sessions` por día/club. Apertura/cierre involucra
 * snapshots de balances declarados por cuenta+moneda y, si hay diferencia,
 * movimientos de ajuste con la categoría reservada del club.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { parseLocalizedAmount } from "@/lib/amounts";
import { accessRepository } from "@/lib/repositories/access-repository";
import { logger } from "@/lib/logger";
import type {
  DailyCashSessionValidation,
  SessionBalanceDraft,
  TreasuryMovementStatus,
  TreasuryMovementType,
} from "@/lib/domain/access";
import {
  buildAccountBalanceDrafts,
  buildClubInitials,
  getSecretariaAccounts,
  getSecretariaSession,
  getTodayDate,
  isMissingStaleSessionAutoCloseRpcError,
  isSessionAlreadyExistsRepositoryError,
  warnedMissingStaleSessionAutoCloseRpcClubIds,
} from "./_shared";
import type { TreasuryActionCode, TreasuryActionResult } from "./types";

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

/**
 * Variante "safe" del guard: logea pero no propaga errores. Para uso
 * desde page.tsx de las 3 routes que muestran info de jornada
 * (/dashboard, /secretary, /treasury) — antes este guard vivía en el
 * layout root, lo que lo ejecutaba en CADA navegación a /rrhh,
 * /settings, /modules sin necesidad. Ahora cada page lo invoca
 * explícitamente.
 */
export async function ensureDailyCashSessionGuardSafe(context: {
  activeClub: { id: string };
  user: { id: string };
}): Promise<void> {
  try {
    await ensureStaleDailyCashSessionAutoClosedForActiveClub(context);
  } catch (error) {
    logger.warn("[daily-session-guard-failed]", {
      clubId: context.activeClub.id,
      userId: context.user.id,
      error,
    });
  }
}

export async function ensureStaleDailyCashSessionAutoClosedForActiveClub(context: {
  activeClub: { id: string };
  user: { id: string };
}) {
  try {
    const todayDate = getTodayDate();
    const staleSession = await accessRepository.getLastOpenDailyCashSessionBeforeDate(
      context.activeClub.id,
      todayDate,
    );

    if (!staleSession) {
      return null;
    }

    const accounts = await getSecretariaAccounts(context.activeClub.id);
    const drafts = await buildAccountBalanceDrafts(
      context.activeClub.id,
      staleSession.sessionDate,
      accounts,
    );

    return await accessRepository.autoCloseStaleDailyCashSessionWithBalances({
      clubId: context.activeClub.id,
      beforeDate: todayDate,
      expectedSessionId: staleSession.id,
      closedByUserId: context.user.id,
      balances: buildSessionBalanceEntries(drafts, "closing"),
    });
  } catch (error) {
    if (isMissingStaleSessionAutoCloseRpcError(error)) {
      if (!warnedMissingStaleSessionAutoCloseRpcClubIds.has(context.activeClub.id)) {
        warnedMissingStaleSessionAutoCloseRpcClubIds.add(context.activeClub.id);
        logger.warn("[stale-session-autoclose-rpc-missing]", {
          clubId: context.activeClub.id,
        });
      }
      return null;
    }

    throw error;
  }
}

function buildDraftFromDeclaredValue(
  draft: SessionBalanceDraft,
  declaredBalance: number,
): SessionBalanceDraft {
  const differenceAmount = declaredBalance - draft.expectedBalance;

  return {
    ...draft,
    declaredBalance,
    differenceAmount,
    adjustmentType:
      differenceAmount === 0 ? null : differenceAmount > 0 ? "ingreso" : "egreso",
  };
}

async function getSessionValidationBase(mode: "open" | "close"): Promise<{
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
      accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate),
    ]);
  } catch (error) {
    logger.error("[session-state-resolution-failed]", {
      operation: "get_session_validation_base",
      mode,
      clubId: context.activeClub.id,
      sessionDate,
      error,
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
      accounts: [],
    };
  }

  if (mode === "close" && (!session || session.status !== "open")) {
    return {
      clubId: context.activeClub.id,
      sessionDate,
      sessionStatus: session?.status ?? "not_started",
      sessionId: session?.id ?? null,
      accounts: [],
    };
  }

  try {
    const drafts = await buildAccountBalanceDrafts(context.activeClub.id, sessionDate, accounts);

    if (mode === "close" && session?.id) {
      const openingBalances = await accessRepository.getSessionOpeningBalances(
        context.activeClub.id,
        session.id,
      );
      const openingMap = new Map(
        openingBalances.map((b) => [`${b.accountId}:${b.currencyCode}`, b.declaredBalance]),
      );
      for (const draft of drafts) {
        draft.openingDeclaredBalance =
          openingMap.get(`${draft.accountId}:${draft.currencyCode}`) ?? 0;
      }
    }

    return {
      clubId: context.activeClub.id,
      sessionDate,
      sessionStatus: session?.status ?? "not_started",
      sessionId: session?.id ?? null,
      accounts: drafts,
    };
  } catch (error) {
    logger.error("[session-balance-data-resolution-failed]", {
      operation: "get_session_validation_base",
      mode,
      clubId: context.activeClub.id,
      sessionDate,
      error,
    });
    return null;
  }
}

export async function getDailyCashSessionValidationForActiveClub(
  mode: "open" | "close",
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
    hasDifferences: base.accounts.some((account) => account.differenceAmount !== 0),
  };
}

async function validateDeclaredBalances(
  mode: "open" | "close",
  input: Array<{
    accountId: string;
    currencyCode: string;
    declaredBalance: string;
  }>,
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

  if (mode === "open") {
    const previousOpenSession = await accessRepository.getLastOpenDailyCashSessionBeforeDate(
      context.activeClub.id,
      base.sessionDate,
    );

    if (previousOpenSession) {
      return { ok: false, code: "previous_session_still_open" };
    }
  }

  if (mode === "close" && !base.sessionId) {
    return { ok: false, code: "session_not_open" };
  }

  if (base.accounts.length === 0) {
    return { ok: false, code: "no_accounts_available" };
  }

  const inputMap = new Map(
    input.map((entry) => [`${entry.accountId}:${entry.currencyCode}`, entry.declaredBalance]),
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
    drafts,
  };
}

function buildSessionBalanceEntries(
  drafts: SessionBalanceDraft[],
  balanceMoment: "opening" | "closing",
) {
  return drafts.map((draft) => ({
    accountId: draft.accountId,
    currencyCode: draft.currencyCode,
    balanceMoment,
    expectedBalance: draft.expectedBalance,
    declaredBalance: draft.declaredBalance,
    differenceAmount: draft.differenceAmount,
  }));
}

async function buildBalanceAdjustmentEntries(input: {
  clubId: string;
  clubName: string;
  userId: string;
  sessionDate: string;
  mode: "open" | "close";
  drafts: SessionBalanceDraft[];
  diffNotes?: string;
}) {
  const draftsWithAdjustments = input.drafts.filter(
    (entry) => entry.differenceAmount !== 0 && entry.adjustmentType,
  );

  if (draftsWithAdjustments.length === 0) {
    return { ok: true, adjustments: [] as SessionAdjustmentEntry[] } as const;
  }

  const adjustmentCategory = await accessRepository.findTreasuryAdjustmentCategory(input.clubId);

  if (!adjustmentCategory) {
    return { ok: false, code: "adjustment_category_missing" } as const;
  }

  const year = input.sessionDate.slice(0, 4);
  const prefix = buildClubInitials(input.clubName);
  const startingSequence = await accessRepository.countTreasuryMovementsByClubAndYear(
    input.clubId,
    year,
  );

  return {
    ok: true,
    adjustments: draftsWithAdjustments.map(
      (draft, index): SessionAdjustmentEntry => ({
        displayId: `${prefix}-MOV-${year}-${startingSequence + index + 1}`,
        accountId: draft.accountId,
        movementType: draft.adjustmentType!,
        categoryId: adjustmentCategory.id,
        concept:
          input.mode === "close" && input.diffNotes?.trim()
            ? input.diffNotes.trim()
            : `${adjustmentCategory.name} ${
                input.mode === "open" ? "de apertura" : "de cierre"
              }`,
        currencyCode: draft.currencyCode,
        amount: Math.abs(draft.differenceAmount),
        movementDate: input.sessionDate,
        createdByUserId: input.userId,
        status: "pending_consolidation" as const,
        differenceAmount: draft.differenceAmount,
        adjustmentMoment: input.mode === "open" ? "opening" : "closing",
      }),
    ),
  } as const;
}

export async function openDailyCashSessionWithDeclaredBalances(
  input: Array<{
    accountId: string;
    currencyCode: string;
    declaredBalance: string;
  }>,
): Promise<TreasuryActionResult> {
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
      drafts: validation.drafts,
    });
  } catch (error) {
    logger.error("[open-session-adjustment-preparation-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      userId: validation.userId,
      error,
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
      adjustments: adjustmentEntries.adjustments,
    });

    if (!createdSession) {
      return { ok: false, code: "session_open_failed" };
    }

    return { ok: true, code: "session_opened" };
  } catch (error) {
    if (isSessionAlreadyExistsRepositoryError(error)) {
      return { ok: false, code: "session_already_exists" };
    }

    logger.error("[open-session-atomic-write-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      userId: validation.userId,
      operation: "open_daily_cash_session_with_balances",
      error,
    });
    return { ok: false, code: "session_open_failed" };
  }
}

export async function closeDailyCashSessionWithDeclaredBalances(
  input: Array<{ accountId: string; currencyCode: string; declaredBalance: string }>,
  options?: { diffNotes?: string; notes?: string },
): Promise<TreasuryActionResult> {
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
      drafts: validation.drafts,
      diffNotes: options?.diffNotes,
    });
  } catch (error) {
    logger.error("[close-session-adjustment-preparation-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      sessionId: validation.sessionId,
      userId: validation.userId,
      error,
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
      notes: options?.notes,
      balances: buildSessionBalanceEntries(validation.drafts, "closing"),
      adjustments: adjustmentEntries.adjustments,
    });

    if (!updated) {
      return { ok: false, code: "session_close_failed" };
    }

    return { ok: true, code: "session_closed" };
  } catch (error) {
    logger.error("[close-session-atomic-write-failed]", {
      clubId: validation.clubId,
      sessionDate: validation.sessionDate,
      sessionId: validation.sessionId,
      userId: validation.userId,
      operation: "close_daily_cash_session_with_balances",
      error,
    });
    return { ok: false, code: "session_close_failed" };
  }
}
