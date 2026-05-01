/**
 * lib/services/treasury/consolidation.ts — flujo de consolidación diaria.
 *
 * Tesorería revisa los movimientos pending_consolidation de un día, los
 * edita si hace falta, los matchea con sus contrapartes (transfers) y
 * dispara el batch atómico que los marca como consolidated.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { parseLocalizedAmount } from "@/lib/amounts";
import type {
  ConsolidationAuditEntry,
  ConsolidationMovement,
  TreasuryConsolidationDashboard,
  TreasuryMovement,
} from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import { logger } from "@/lib/logger";
import { texts } from "@/lib/texts";
import {
  getAccountsVisibleForRole,
  getActiveReceiptFormatsForRole,
  getAvailableBalanceForAccountCurrency,
  getConfiguredTreasuryCurrencies,
  getDefaultConsolidationDate,
  getTesoreriaSession,
  getTodayDate,
  getTransferTargetAccountsForSecretaria,
  isReceiptNumberValidForFormats,
  isValidOperationalDate,
  logTreasuryServiceFailure,
  resolveConsolidationInfrastructureFailure,
  serializeMovementSnapshot,
} from "./_shared";
import { ensureStaleDailyCashSessionAutoClosedForActiveClub } from "./sessions";
import type { TreasuryActionResult } from "./types";

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
    fxOperationReference: movement.fxOperationGroupId ?? null,
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
  const today = getTodayDate();

  try {
    await ensureStaleDailyCashSessionAutoClosedForActiveClub({
      activeClub: { id: clubId },
      user: { id: context.user.id }
    });
  } catch (error) {
    logger.warn("[daily-session-guard-failed]", {
      clubId,
      userId: context.user.id,
      source: "treasury_consolidation_dashboard",
      error
    });
  }

  const allAccounts = await accessRepository.listTreasuryAccountsForClub(clubId);
  const allAccountIds = allAccounts.map((account) => account.id);
  const [movements, integrations, allClubMovements] = await Promise.all([
    accessRepository.listTreasuryMovementsByDate(clubId, selectedDate),
    accessRepository.listMovementIntegrations(),
    allAccountIds.length > 0
      ? accessRepository.listTreasuryMovementsHistoryByAccounts(clubId, allAccountIds)
      : Promise.resolve([] as TreasuryMovement[])
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

  const dailyCashSession = await accessRepository.getDailyCashSessionByDate(clubId, selectedDate);
  const sessionStatus: TreasuryConsolidationDashboard["sessionStatus"] =
    dailyCashSession?.status ?? "not_started";
  const sessionCloseType: TreasuryConsolidationDashboard["sessionCloseType"] =
    dailyCashSession?.status === "closed" ? dailyCashSession.closeType : null;
  const sessionClosedAt: TreasuryConsolidationDashboard["sessionClosedAt"] =
    dailyCashSession?.closedAt ?? null;

  if (sessionStatus === "open") {
    return {
      consolidationDate: selectedDate,
      defaultDate: getDefaultConsolidationDate(),
      hasLoadedDate: Boolean(consolidationDate?.trim()),
      sessionStatus,
      sessionCloseType,
      sessionClosedAt,
      batch,
      pendingMovements: [],
      integratedMovements: [],
      totalPendingCount: 0,
      totalPendingArsNet: 0,
      approvedTodayCount: 0
    };
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

  const clubPendingMovements = allClubMovements.filter(
    (movement) => movement.status === "pending_consolidation"
  );
  const totalPendingCount = clubPendingMovements.length;
  const totalPendingArsNet = clubPendingMovements.reduce((total, movement) => {
    if (movement.currencyCode !== "ARS") return total;
    const signed = movement.movementType === "egreso" ? -movement.amount : movement.amount;
    return total + signed;
  }, 0);
  const approvedTodayCount = allClubMovements.filter(
    (movement) =>
      movement.movementDate === today &&
      (movement.status === "consolidated" || movement.status === "integrated")
  ).length;

  return {
    consolidationDate: selectedDate,
    defaultDate: getDefaultConsolidationDate(),
    hasLoadedDate: Boolean(consolidationDate?.trim()),
    sessionStatus,
    sessionCloseType,
    sessionClosedAt,
    batch,
    pendingMovements: mapped.filter((movement) => movement.status === "pending_consolidation"),
    integratedMovements: mapped.filter((movement) => movement.status === "integrated"),
    totalPendingCount,
    totalPendingArsNet,
    approvedTodayCount
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
