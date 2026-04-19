import { redirect } from "next/navigation";

import {
  executeDailyConsolidationAction,
  integrateMatchingMovementAction,
  updateMovementBeforeConsolidationAction,
  updateTransferBeforeConsolidationAction
} from "@/app/(dashboard)/treasury/actions";
import { TreasuryConsolidationCard } from "@/components/dashboard/treasury-consolidation-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateTesoreria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForTesoreria,
  getActiveReceiptFormatsForTesoreria,
  getActiveTreasuryCurrenciesForTesoreria,
  getEnabledCalendarEventsForTesoreria,
  getEnabledMovementTypesForTesoreria,
  getMovementAuditEntries,
  getTreasuryConsolidationDashboard
} from "@/lib/services/treasury-service";

type TreasuryConsolidationPageProps = {
  searchParams?: {
    date?: string;
    movement?: string;
  };
};

export default async function TreasuryConsolidationPage({
  searchParams
}: TreasuryConsolidationPageProps) {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!canOperateTesoreria(context.activeMembership)) {
    redirect("/dashboard");
  }

  const dashboard = await getTreasuryConsolidationDashboard(searchParams?.date);

  if (!dashboard) {
    redirect("/dashboard");
  }

  const selectedMovement =
    dashboard.pendingMovements.find((movement) => movement.movementId === searchParams?.movement) ??
    dashboard.integratedMovements.find((movement) => movement.movementId === searchParams?.movement) ??
    dashboard.pendingMovements[0] ??
    dashboard.integratedMovements[0] ??
    null;

  const [auditEntries, allAccounts, categories, activities, calendarEvents, currencies, movementTypes, receiptFormats] = await Promise.all([
    selectedMovement ? getMovementAuditEntries(selectedMovement.movementId) : Promise.resolve([]),
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((entries) =>
      entries.filter((category) => category.visibleForTesoreria)
    ),
    getActiveActivitiesForTesoreria(),
    getEnabledCalendarEventsForTesoreria(),
    getActiveTreasuryCurrenciesForTesoreria(),
    getEnabledMovementTypesForTesoreria(),
    getActiveReceiptFormatsForTesoreria()
  ]);

  return (
    <TreasuryConsolidationCard
      dashboard={dashboard}
      selectedMovement={selectedMovement}
      selectedAuditEntries={auditEntries}
      accounts={allAccounts.filter((account) => account.visibleForTesoreria)}
      transferSourceAccounts={allAccounts.filter((account) => account.visibleForSecretaria)}
      transferTargetAccounts={allAccounts.filter((account) => !account.visibleForSecretaria && account.visibleForTesoreria)}
      categories={categories}
      activities={activities}
      calendarEvents={calendarEvents}
      currencies={currencies}
      movementTypes={movementTypes}
      receiptFormats={receiptFormats}
      updateMovementBeforeConsolidationAction={updateMovementBeforeConsolidationAction}
      updateTransferBeforeConsolidationAction={updateTransferBeforeConsolidationAction}
      integrateMatchingMovementAction={integrateMatchingMovementAction}
      executeDailyConsolidationAction={executeDailyConsolidationAction}
    />
  );
}
