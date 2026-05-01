/**
 * lib/services/treasury/dashboard.ts — builders del dashboard.
 *
 * Dos shapes principales:
 *  - DashboardTreasuryCard: vista de Secretaría (sesión del día + movimientos
 *    de hoy + acciones disponibles).
 *  - TreasuryRoleDashboard: vista de Tesorería (cuentas del rol, movimientos
 *    en una ventana temporal, stats mensuales, pendientes de conciliación).
 *
 * Re-exportado desde `lib/services/treasury-service` (P2 audit · service split).
 */
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import type {
  DashboardTreasuryCard,
  TreasuryDashboardMovement,
  TreasuryMovement,
  TreasuryRoleDashboard,
} from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";
import { costCenterRepository } from "@/lib/repositories/cost-center-repository";
import { logger } from "@/lib/logger";
import {
  buildAccountBalances,
  buildDashboardMovementView,
  getAccountsVisibleForRole,
  getRelativeDate,
  getTesoreriaSession,
  getTodayDate,
  isMissingBulkMovementHistoryRpcError,
  isMovementWithinOperationalWindow,
  isTreasuryRoleMovementEditable,
  shouldIncludeMovementInRoleBalances,
} from "./_shared";

export async function getDashboardTreasuryCardForActiveClub(): Promise<
  DashboardTreasuryCard | null
> {
  const context = await getAuthenticatedSessionContext();

  if (!context?.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    return null;
  }

  const clubId = context.activeClub.id;
  const sessionDate = getTodayDate();
  let session: Awaited<ReturnType<typeof accessRepository.getDailyCashSessionByDate>> = null;
  let sessionStateResolved = true;
  let movementDataResolved = true;

  try {
    session = await accessRepository.getDailyCashSessionByDate(clubId, sessionDate);
  } catch (error) {
    sessionStateResolved = false;
    logger.error("[dashboard-session-state-resolution-failed]", {
      clubId,
      sessionDate,
      error,
    });
  }

  const [accounts, categories, activities, calendarEvents] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(clubId),
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
  ]);

  const secretaryAccounts = accounts.filter((account) => account.visibleForSecretaria);
  let historicalMovements: TreasuryMovement[] = [];
  let visibleMovements: TreasuryMovement[] = [];
  let shouldUseLegacyMovementFallback = false;

  try {
    historicalMovements = (
      await accessRepository.listTreasuryMovementsHistoryByAccounts(
        clubId,
        secretaryAccounts.map((account) => account.id),
      )
    ).filter((movement) => shouldIncludeMovementInRoleBalances(movement, "secretaria"));
    visibleMovements = historicalMovements.filter(
      (movement) =>
        secretaryAccounts.some((account) => account.id === movement.accountId) &&
        movement.movementDate === sessionDate,
    );
  } catch (error) {
    if (isMissingBulkMovementHistoryRpcError(error)) {
      shouldUseLegacyMovementFallback = true;
    } else {
      movementDataResolved = false;
      logger.error("[dashboard-balance-data-resolution-failed]", {
        clubId,
        error,
      });
    }
  }

  const visibleAccountIds = new Set(secretaryAccounts.map((account) => account.id));
  let balanceMovementsByAccount = new Map<string, TreasuryMovement[]>();

  if (!shouldUseLegacyMovementFallback) {
    balanceMovementsByAccount = new Map(
      secretaryAccounts.map((account) => [
        account.id,
        historicalMovements.filter((movement) => movement.accountId === account.id),
      ]),
    );
  } else {
    try {
      const historicalMovementsByAccount = await Promise.all(
        secretaryAccounts.map(
          async (account) =>
            [
              account.id,
              (
                await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)
              ).filter((movement) =>
                shouldIncludeMovementInRoleBalances(movement, "secretaria"),
              ),
            ] as const,
        ),
      );

      balanceMovementsByAccount = new Map(historicalMovementsByAccount);

      const sameDayMovements = await accessRepository.listTreasuryMovementsByDateStrict(
        clubId,
        sessionDate,
      );
      visibleMovements = sameDayMovements.filter((movement) =>
        visibleAccountIds.has(movement.accountId),
      );
    } catch (error) {
      movementDataResolved = false;
      logger.error("[dashboard-movement-fallback-resolution-failed]", {
        clubId,
        sessionDate,
        error,
      });
    }
  }

  const sessionUserIds = [session?.openedByUserId, session?.closedByUserId].filter(
    (id): id is string => !!id,
  );
  const users = await accessRepository.findUsersByIds([
    ...new Set([
      ...visibleMovements.map((movement) => movement.createdByUserId),
      ...sessionUserIds,
    ]),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(secretaryAccounts.map((account) => [account.id, account]));
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const calendarEventsById = new Map(calendarEvents.map((event) => [event.id, event]));

  return {
    sessionStatus: sessionStateResolved ? session?.status ?? "not_started" : "unresolved",
    movementDataStatus: movementDataResolved ? "resolved" : "unresolved",
    sessionDate,
    sessionId: session?.id ?? null,
    sessionOpenedAt: session?.openedAt ?? null,
    sessionOpenedByUserName: session?.openedByUserId
      ? usersById.get(session.openedByUserId)?.fullName ?? null
      : null,
    sessionClosedAt: session?.closedAt ?? null,
    accounts: secretaryAccounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, balanceMovementsByAccount.get(account.id) ?? []),
    })),
    movements: visibleMovements
      .map((movement) =>
        buildDashboardMovementView({
          movement,
          accountsById,
          categoriesById,
          activitiesById,
          calendarEventsById,
          usersById,
          canEdit: session?.status === "open",
        }),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    availableActions: !sessionStateResolved
      ? []
      : session?.status === "open"
        ? ["close_session", "create_movement"]
        : session?.status === "closed"
          ? []
          : ["open_session"],
  };
}

export async function getTreasuryRoleDashboardForActiveClub(options?: {
  movementsFromDate?: string;
  movementsToDate?: string;
}): Promise<TreasuryRoleDashboard | null> {
  const context = await getTesoreriaSession();

  if (!context?.activeClub) {
    return null;
  }

  const clubId = context.activeClub.id;
  const sessionDate = getTodayDate();
  // Default: ultimos 30 dias (movimientos de [today-29, today]).
  // El UI puede pasar fromDate/toDate para custom ranges via querystring.
  const movementsToDate = options?.movementsToDate ?? sessionDate;
  const movementsFromDate = options?.movementsFromDate ?? getRelativeDate(movementsToDate, -29);
  const movementWindowStartDate = movementsFromDate;
  const accounts = getAccountsVisibleForRole(
    await accessRepository.listTreasuryAccountsForClub(clubId),
    "tesoreria",
  );
  const visibleAccountIds = new Set(accounts.map((account) => account.id));

  const movementsByAccount = await Promise.all(
    accounts.map(async (account) => ({
      account,
      movements: (
        await accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id)
      ).filter((movement) => shouldIncludeMovementInRoleBalances(movement, "tesoreria")),
    })),
  );

  const [categories, activities, calendarEvents] = await Promise.all([
    accessRepository.listTreasuryCategoriesForClub(clubId),
    accessRepository.listClubActivitiesForClub(clubId),
    accessRepository.listClubCalendarEventsForClub(clubId),
  ]);
  let roleMovements: TreasuryMovement[] = [];
  let shouldUseLegacyMovementFallback = false;

  try {
    roleMovements = await accessRepository.listTreasuryMovementsHistoryByAccounts(
      clubId,
      accounts.map((account) => account.id),
    );
  } catch (error) {
    if (isMissingBulkMovementHistoryRpcError(error)) {
      shouldUseLegacyMovementFallback = true;
    } else {
      logger.error("[treasury-role-dashboard-movement-resolution-failed]", {
        clubId,
        error,
      });
      throw error;
    }
  }

  if (shouldUseLegacyMovementFallback) {
    try {
      roleMovements = (
        await Promise.all(
          accounts.map((account) =>
            accessRepository.listTreasuryMovementsHistoryByAccount(clubId, account.id),
          ),
        )
      ).flat();
    } catch (error) {
      logger.error("[treasury-role-dashboard-movement-fallback-resolution-failed]", {
        clubId,
        error,
      });
      throw error;
    }
  }

  const visibleRoleMovements = roleMovements
    .filter((movement) => visibleAccountIds.has(movement.accountId))
    .filter((movement) => shouldIncludeMovementInRoleBalances(movement, "tesoreria"))
    .filter((movement) =>
      isMovementWithinOperationalWindow(
        movement.movementDate,
        movementWindowStartDate,
        movementsToDate,
      ),
    );
  const users = await accessRepository.findUsersByIds([
    ...new Set(visibleRoleMovements.map((movement) => movement.createdByUserId)),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const calendarEventsById = new Map(calendarEvents.map((event) => [event.id, event]));
  // Bulk-load CC links de los movimientos visibles para precargar el
  // multiselect del edit modal sin N+1.
  let costCenterIdsByMovement = new Map<string, string[]>();
  try {
    costCenterIdsByMovement = await costCenterRepository.listLinksForMovementsMap(
      clubId,
      visibleRoleMovements.map((m) => m.id),
    );
  } catch (error) {
    logger.error("[treasury-role-dashboard.cost_center_links_failed]", { clubId, error });
  }
  const dashboardMovements = visibleRoleMovements
    .map((movement) =>
      buildDashboardMovementView({
        movement,
        costCenterIdsByMovement,
        accountsById,
        categoriesById,
        activitiesById,
        calendarEventsById,
        usersById,
        canEdit: isTreasuryRoleMovementEditable(movement),
      }),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  type DashboardMovementGroupEntries = Map<string, TreasuryDashboardMovement[]>;
  const movementGroups = Array.from(
    dashboardMovements
      .reduce((groups, movement) => {
        const dateGroup =
          groups.get(movement.movementDate) ?? new Map<string, TreasuryDashboardMovement[]>();
        const accountGroup = dateGroup.get(movement.accountId) ?? [];

        accountGroup.push(movement);
        dateGroup.set(movement.accountId, accountGroup);
        groups.set(movement.movementDate, dateGroup);

        return groups;
      }, new Map<string, DashboardMovementGroupEntries>())
      .entries(),
  )
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([movementDate, accountGroups]) => ({
      movementDate,
      accounts: Array.from(accountGroups.entries())
        .map(([accountId, movements]) => ({
          accountId,
          accountName: accountsById.get(accountId)?.name ?? "",
          movements: [...movements].sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt),
          ),
        }))
        .sort((left, right) => left.accountName.localeCompare(right.accountName)),
    }));

  // Monthly stats: computed from balance-filtered movements for current month
  const monthPrefix = sessionDate.slice(0, 7);
  const monthlyStatsMap = new Map<string, { ingreso: number; egreso: number }>();
  for (const { movements } of movementsByAccount) {
    for (const movement of movements) {
      if (!movement.movementDate.startsWith(monthPrefix)) continue;
      const curr = movement.currencyCode;
      const stats = monthlyStatsMap.get(curr) ?? { ingreso: 0, egreso: 0 };
      if (movement.movementType === "ingreso") {
        stats.ingreso += movement.amount;
      } else {
        stats.egreso += movement.amount;
      }
      monthlyStatsMap.set(curr, stats);
    }
  }
  const monthlyStats = [...monthlyStatsMap.entries()]
    .map(([currencyCode, stats]) => ({ currencyCode, ...stats }))
    .sort((a, b) => {
      if (a.currencyCode === "ARS") return -1;
      if (b.currencyCode === "ARS") return 1;
      return a.currencyCode.localeCompare(b.currencyCode);
    });

  // Pending conciliation count: secretaría movements on tesorería-visible accounts
  const pendingConciliationCount = new Set(
    roleMovements
      .filter((m) => visibleAccountIds.has(m.accountId) && m.status === "pending_consolidation")
      .map((m) => m.id),
  ).size;

  // Per-account pending status (used for conciliation chips in ResumenTab)
  const accountsWithPending = new Set(
    roleMovements
      .filter((m) => visibleAccountIds.has(m.accountId) && m.status === "pending_consolidation")
      .map((m) => m.accountId),
  );

  return {
    sessionDate,
    accounts: movementsByAccount.map(({ account, movements }) => ({
      accountId: account.id,
      name: account.name,
      balances: buildAccountBalances(account, movements),
      hasPendingMovements: account.visibleForSecretaria && accountsWithPending.has(account.id),
      hasConciliatedMovements: movements.length > 0,
    })),
    movementGroups,
    movementsWindow: {
      fromDate: movementsFromDate,
      toDate: movementsToDate,
      count: dashboardMovements.length,
    },
    availableActions: ["create_movement", "create_fx_operation", "create_transfer"],
    monthlyStats,
    pendingConciliationCount,
  };
}
