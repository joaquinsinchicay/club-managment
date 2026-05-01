/**
 * lib/services/treasury/transfers.ts — transferencias entre cuentas del club.
 *
 * Una transferencia se modela como 1 fila en `account_transfers` + 2 movements
 * hijos (egreso source + ingreso target) compartiendo `transfer_group_id`.
 * Ver CLAUDE.md §"Transferencias entre cuentas (US-25)" para el modelo.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { parseLocalizedAmount } from "@/lib/amounts";
import { accessRepository } from "@/lib/repositories/access-repository";
import { logger } from "@/lib/logger";
import { texts } from "@/lib/texts";
import {
  generateMovementDisplayIds,
  getAccountsVisibleForRole,
  getAvailableBalanceForAccountCurrency,
  getConfiguredTreasuryCurrencies,
  getSecretariaSession,
  getTesoreriaSession,
  getTodayDate,
  getTransferTargetAccountsForSecretaria,
  resolveConsolidationInfrastructureFailure,
  serializeMovementSnapshot,
} from "./_shared";
import type { TreasuryActionResult } from "./types";

export async function createAccountTransfer(input: {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  amount: string;
  concept: string;
  originRole?: "secretaria" | "tesoreria";
}): Promise<TreasuryActionResult> {
  const requestedRole: "secretaria" | "tesoreria" = input.originRole ?? "secretaria";
  const context =
    requestedRole === "tesoreria" ? await getTesoreriaSession() : await getSecretariaSession();

  if (!context?.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  let sessionId: string | null = null;

  if (requestedRole === "secretaria") {
    let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;

    try {
      session = await accessRepository.getDailyCashSessionByDate(
        context.activeClub.id,
        getTodayDate(),
      );
    } catch (error) {
      logger.error("[create-account-transfer-session-resolution-failed]", {
        clubId: context.activeClub.id,
        sessionDate: getTodayDate(),
        error,
      });
      return { ok: false, code: "forbidden" };
    }

    if (!session || session.status !== "open") {
      return { ok: false, code: "session_required" };
    }

    sessionId = session.id;
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

  const eligibleSourceAccounts =
    requestedRole === "tesoreria"
      ? getAccountsVisibleForRole(allAccounts, "tesoreria")
      : getAccountsVisibleForRole(allAccounts, "secretaria");

  const sourceAccount = eligibleSourceAccounts.find(
    (account) => account.id === input.sourceAccountId,
  );

  const eligibleTargetAccounts =
    requestedRole === "tesoreria"
      ? allAccounts.filter((account) => account.id !== input.sourceAccountId)
      : getTransferTargetAccountsForSecretaria(allAccounts);

  const targetAccount = eligibleTargetAccounts.find(
    (account) => account.id === input.targetAccountId,
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
    effectiveDate: getTodayDate(),
  });

  if (parsedAmount > availableBalance) {
    return { ok: false, code: "insufficient_funds" };
  }

  const concept = input.concept.trim() || texts.dashboard.treasury.transfer_default_concept;
  const [sourceMovementDisplayId, targetMovementDisplayId] = await generateMovementDisplayIds(
    context.activeClub.id,
    context.activeClub.name,
    getTodayDate(),
    2,
  );
  if (!sourceMovementDisplayId || !targetMovementDisplayId) {
    return { ok: false, code: "unknown_error" };
  }
  const transfer = await accessRepository.createAccountTransfer({
    clubId: context.activeClub.id,
    dailyCashSessionId: sessionId,
    sourceAccountId: sourceAccount.id,
    targetAccountId: targetAccount.id,
    currencyCode: input.currencyCode,
    amount: parsedAmount,
    concept,
    sourceMovementDisplayId,
    targetMovementDisplayId,
    movementDate: getTodayDate(),
    createdByUserId: context.user.id,
    originRole: requestedRole,
  });

  if (!transfer) {
    return { ok: false, code: "unknown_error" };
  }

  return {
    ok: true,
    code: "transfer_created",
    movementDisplayId: transfer.sourceMovementDisplayId,
  };
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
    session = await accessRepository.getDailyCashSessionByDate(clubId, getTodayDate());
  } catch (error) {
    logger.error("[update-secretaria-transfer-session-resolution-failed]", { clubId, error });
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
  if (input.sourceAccountId === input.targetAccountId)
    return { ok: false, code: "accounts_must_be_distinct" };
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
    (account) => account.id === input.sourceAccountId,
  );
  const targetAccount = getTransferTargetAccountsForSecretaria(allAccounts).find(
    (account) => account.id === input.targetAccountId,
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
    excludeMovementId: sourceMovement.id,
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
      amount: parsedAmount,
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
      amount: parsedAmount,
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
      performedByUserId: context.user.id,
    });

    await accessRepository.createMovementAuditLog({
      clubId,
      movementId: updatedTargetMovement.id,
      actionType: "edited",
      payloadBefore: targetBeforeSnapshot,
      payloadAfter: serializeMovementSnapshot(updatedTargetMovement),
      performedByUserId: context.user.id,
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
          targetAccountId: targetAccount.id,
        },
        error,
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}
