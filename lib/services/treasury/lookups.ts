/**
 * lib/services/treasury/lookups.ts — getters de reference data (activities,
 * calendar events, currencies, movement types, receipt formats) y detalle
 * de cuenta. Son el shape más simple del módulo: cada función tira de
 * `getSecretariaSession` o `getTesoreriaSession`, consulta `accessRepository`,
 * y retorna el subset visible para el rol.
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccountDetail,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
} from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  buildAccountBalances,
  getAccountsVisibleForRole,
  getConfiguredMovementTypes,
  getConfiguredTreasuryCurrencies,
  getSecretariaSession,
  getTesoreriaSession,
  getTodayDate,
  shouldIncludeMovementInRoleBalances,
  type TreasuryVisibilityRole,
} from "./_shared";

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

export async function getActiveTreasuryCurrenciesForSecretaria(): Promise<
  TreasuryCurrencyConfig[]
> {
  const context = await getSecretariaSession();

  if (!context?.activeClub) {
    return [];
  }

  return getConfiguredTreasuryCurrencies(context.activeClub.id);
}

export async function getActiveTreasuryCurrenciesForTesoreria(): Promise<
  TreasuryCurrencyConfig[]
> {
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

export async function getTreasuryAccountDetailForActiveClub(
  accountId: string,
  role: TreasuryVisibilityRole = "secretaria",
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
    accessRepository.getDailyCashSessionByDate(context.activeClub.id, sessionDate),
  ]);

  const visibleAccounts = getAccountsVisibleForRole(accounts, role);
  const selectedAccount =
    visibleAccounts.find((account) => account.id === accountId) ?? visibleAccounts[0] ?? null;

  if (!selectedAccount) {
    return {
      accounts: [],
      detail: null,
    };
  }

  const movements = await accessRepository.listTreasuryMovementsHistoryByAccount(
    context.activeClub.id,
    selectedAccount.id,
  );

  const visibleMovements = movements.filter((movement) =>
    shouldIncludeMovementInRoleBalances(movement, role),
  );
  const balances = buildAccountBalances(selectedAccount, visibleMovements);

  const detail: TreasuryAccountDetail = {
    account: {
      accountId: selectedAccount.id,
      name: selectedAccount.name,
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
          createdByUserName:
            movement.createdByUserId === context.user.id
              ? context.user.fullName
              : movement.createdByUserId,
          createdAt: movement.createdAt,
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };

  return {
    accounts: visibleAccounts,
    detail,
  };
}
