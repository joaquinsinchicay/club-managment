/**
 * lib/services/treasury/movements.ts — CRUD de treasury movements.
 *
 * 4 funciones públicas:
 *  - createTreasuryMovement: Secretaría crea un movement en sesión abierta
 *    (devuelve un optimistic update para el cliente).
 *  - updateSecretariaMovementInOpenSession: Secretaría edita un movement de
 *    su jornada activa (escribe audit log).
 *  - createTreasuryRoleMovement: Tesorería crea un movement directo (status
 *    "posted", sin sesión).
 *  - updateTreasuryRoleMovement: Tesorería edita un movement role-issued.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { parseLocalizedAmount } from "@/lib/amounts";
import { accessRepository } from "@/lib/repositories/access-repository";
import { logger } from "@/lib/logger";
import {
  buildDashboardMovementView,
  buildMovementSignedAmount,
  generateMovementDisplayId,
  getActiveReceiptFormatsForRole,
  getAvailableBalanceForAccountCurrency,
  getConfiguredMovementTypes,
  getConfiguredTreasuryCurrencies,
  getSecretariaSession,
  getTesoreriaSession,
  getTodayDate,
  isReceiptNumberValidForFormats,
  isTreasuryRoleMovementEditable,
  resolveConsolidationInfrastructureFailure,
  serializeMovementSnapshot,
} from "./_shared";
import type {
  TreasuryActionResult,
  TreasuryActionResultWithOptimisticUpdate,
} from "./types";

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
    session = await accessRepository.getDailyCashSessionByDate(
      context.activeClub.id,
      getTodayDate(),
    );
  } catch (error) {
    logger.error("[create-treasury-movement-session-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate: getTodayDate(),
      error,
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
    configuredMovementTypes,
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id),
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled,
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForSecretaria,
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForSecretaria,
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
      effectiveDate: getTodayDate(),
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find(
          (entry) => entry.id === input.activityId && entry.visibleForSecretaria,
        ) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(
    context.activeClub.id,
    "secretaria",
  );

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find(
          (entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury,
        ) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const created = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(
      context.activeClub.id,
      context.activeClub.name,
      getTodayDate(),
    ),
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
    createdByUserId: context.user.id,
  });

  if (!created) {
    return { ok: false, code: "movement_create_failed" };
  }

  const optimisticUsersById = new Map([[context.user.id, context.user]]);
  const optimisticAccountsById = new Map(accounts.map((entry) => [entry.id, entry]));
  const optimisticCategoriesById = new Map(categories.map((entry) => [entry.id, entry]));
  const optimisticActivitiesById = new Map(activities.map((entry) => [entry.id, entry]));
  const optimisticCalendarEventsById = new Map(
    calendarEvents.map((entry) => [entry.id, entry]),
  );

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
        canEdit: true,
      }),
      balanceDelta: {
        accountId: created.accountId,
        currencyCode: created.currencyCode,
        amountDelta: buildMovementSignedAmount(created.movementType, created.amount),
      },
    },
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
    session = await accessRepository.getDailyCashSessionByDate(
      context.activeClub.id,
      getTodayDate(),
    );
  } catch (error) {
    logger.error("[update-secretaria-movement-session-resolution-failed]", {
      clubId: context.activeClub.id,
      sessionDate: getTodayDate(),
      error,
    });
    return { ok: false, code: "forbidden" };
  }

  if (!session || session.status !== "open") {
    return { ok: false, code: "session_required" };
  }

  const movement = await accessRepository.findTreasuryMovementById(
    context.activeClub.id,
    input.movementId,
  );

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
    configuredMovementTypes,
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id),
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled,
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForSecretaria,
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForSecretaria,
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
      effectiveDate: movement.movementDate,
      excludeMovementId: movement.id,
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find(
          (entry) => entry.id === input.activityId && entry.visibleForSecretaria,
        ) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(
    context.activeClub.id,
    "secretaria",
  );

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find(
          (entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury,
        ) ?? null
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
      amount: parsedAmount,
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
      performedByUserId: context.user.id,
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        {
          clubId: context.activeClub.id,
          movementId: movement.id,
          accountId: account.id,
        },
        error,
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
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

  const [
    accounts,
    categories,
    activities,
    calendarEvents,
    configuredCurrencies,
    configuredMovementTypes,
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
    accessRepository.listClubActivitiesForClub(context.activeClub.id),
    accessRepository.listClubCalendarEventsForClub(context.activeClub.id),
    getConfiguredTreasuryCurrencies(context.activeClub.id),
    getConfiguredMovementTypes(context.activeClub.id),
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled,
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForTesoreria,
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForTesoreria,
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
      role: "tesoreria",
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find(
          (entry) => entry.id === input.activityId && entry.visibleForTesoreria,
        ) ?? null
      : null;

  if (input.activityId.trim().length > 0 && !activity) {
    return { ok: false, code: "invalid_activity" };
  }

  const receiptNumber = input.receiptNumber.trim();
  const activeReceiptFormats = await getActiveReceiptFormatsForRole(
    context.activeClub.id,
    "tesoreria",
  );

  if (!isReceiptNumberValidForFormats(receiptNumber, activeReceiptFormats)) {
    return { ok: false, code: "invalid_receipt_format" };
  }

  const calendarEvent =
    input.calendarEventId.trim().length > 0
      ? calendarEvents.find(
          (entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury,
        ) ?? null
      : null;

  if (input.calendarEventId.trim().length > 0 && !calendarEvent) {
    return { ok: false, code: "invalid_calendar_event" };
  }

  const created = await accessRepository.createTreasuryMovement({
    displayId: await generateMovementDisplayId(
      context.activeClub.id,
      context.activeClub.name,
      movementDate,
    ),
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
    status: "posted",
  });

  if (!created) {
    return { ok: false, code: "movement_create_failed" };
  }

  return {
    ok: true,
    code: "movement_created",
    movementDisplayId: created.displayId,
    movementId: created.id,
  };
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

  const [
    accounts,
    categories,
    activities,
    calendarEvents,
    configuredCurrencies,
    configuredMovementTypes,
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
    getConfiguredTreasuryCurrencies(clubId),
    getConfiguredMovementTypes(clubId),
  ]);

  if (
    !configuredMovementTypes.some(
      (movementType) =>
        movementType.movementType === input.movementType && movementType.isEnabled,
    )
  ) {
    return { ok: false, code: "movement_type_required" };
  }

  const account = accounts.find(
    (entry) => entry.id === input.accountId && entry.visibleForTesoreria,
  );

  if (!account) {
    return { ok: false, code: "invalid_account" };
  }

  const category = categories.find(
    (entry) => entry.id === input.categoryId && entry.visibleForTesoreria,
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
      clubId,
      accountId: account.id,
      currencyCode: input.currencyCode,
      effectiveDate: movement.movementDate,
      excludeMovementId: movement.id,
      role: "tesoreria",
    });

    if (parsedAmount > availableBalance) {
      return { ok: false, code: "insufficient_funds" };
    }
  }

  const activity =
    input.activityId.trim().length > 0
      ? activities.find(
          (entry) => entry.id === input.activityId && entry.visibleForTesoreria,
        ) ?? null
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
      ? calendarEvents.find(
          (entry) => entry.id === input.calendarEventId && entry.isEnabledForTreasury,
        ) ?? null
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
      amount: parsedAmount,
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
      performedByUserId: context.user.id,
    });
  } catch (error) {
    return (
      resolveConsolidationInfrastructureFailure(
        "update_treasury_movement",
        { clubId, movementId: movement.id, accountId: account.id },
        error,
      ) ?? { ok: false, code: "unknown_error" }
    );
  }

  return { ok: true, code: "movement_updated" };
}
