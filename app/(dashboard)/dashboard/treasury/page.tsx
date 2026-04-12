import { redirect } from "next/navigation";

import {
  createFxOperationAction,
  createTreasuryRoleMovementAction,
  updateTreasuryRoleMovementAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { TreasuryRoleCard } from "@/components/dashboard/treasury-role-card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateTesoreria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForTesoreria,
  getActiveReceiptFormatsForTesoreria,
  getActiveTreasuryCurrenciesForTesoreria,
  getEnabledMovementTypesForTesoreria,
  getTreasuryRoleDashboardForActiveClub
} from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

export default async function TreasuryDashboardPage() {
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

  const dashboard = await getTreasuryRoleDashboardForActiveClub();

  if (!dashboard) {
    redirect("/dashboard");
  }

  const [accounts, categories, activities, currencies, movementTypes, receiptFormats] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id).then((entries) =>
      entries.filter((account) => account.visibleForTesoreria)
    ),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((entries) =>
      entries.filter((category) => category.visibleForTesoreria)
    ),
    getActiveActivitiesForTesoreria(),
    getActiveTreasuryCurrenciesForTesoreria(),
    getEnabledMovementTypesForTesoreria(),
    getActiveReceiptFormatsForTesoreria()
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.header.navigation.tesoreria}
        title={texts.dashboard.treasury_role.title}
        description={texts.dashboard.treasury_role.description}
      />

      <TreasuryRoleCard
        dashboard={dashboard}
        accounts={accounts}
        categories={categories}
        activities={activities}
        currencies={currencies}
        movementTypes={movementTypes}
        receiptFormats={receiptFormats}
        createTreasuryRoleMovementAction={createTreasuryRoleMovementAction}
        updateTreasuryRoleMovementAction={updateTreasuryRoleMovementAction}
        createFxOperationAction={createFxOperationAction}
      />
    </main>
  );
}
