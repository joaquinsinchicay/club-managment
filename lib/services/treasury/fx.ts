/**
 * lib/services/treasury/fx.ts — operación FX (compra/venta de moneda).
 *
 * Crea un par de movements (egreso source + ingreso target) atados a una
 * fila en `fx_operations`. La unidad atómica es la operación FX; cada
 * movement queda con `fxOperationGroupId` para reconstruir el par.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { parseLocalizedAmount } from "@/lib/amounts";
import { accessRepository } from "@/lib/repositories/access-repository";
import { texts } from "@/lib/texts";
import {
  generateMovementDisplayId,
  getAvailableBalanceForAccountCurrency,
  getTesoreriaAccounts,
  getTesoreriaSession,
  getTodayDate,
} from "./_shared";
import type { TreasuryActionResult } from "./types";

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
    role: "tesoreria",
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
    concept,
  });

  if (!operation) {
    return { ok: false, code: "unknown_error" };
  }

  const sourceMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(
      context.activeClub.id,
      context.activeClub.name,
      getTodayDate(),
    ),
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
    status: "posted",
  });

  if (!sourceMovement) {
    return { ok: false, code: "unknown_error" };
  }

  const targetMovement = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(
      context.activeClub.id,
      context.activeClub.name,
      getTodayDate(),
    ),
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
    status: "posted",
  });

  if (!targetMovement) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "fx_operation_created" };
}
