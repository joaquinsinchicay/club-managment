import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import {
  createAccountTransferAction,
  createFxOperationAction,
  createTreasuryMovementAction,
  createTreasuryRoleMovementAction,
  updateSecretariaMovementAction,
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { TreasuryRoleCard } from "@/components/dashboard/treasury-role-card";
import { AppHeader } from "@/components/navigation/app-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import {
  getActiveActivitiesForTesoreria,
  getActiveActivitiesForSecretaria,
  getEnabledCalendarEventsForSecretaria,
  getActiveTreasuryCurrenciesForTesoreria,
  getActiveTreasuryCurrenciesForSecretaria,
  getEnabledMovementTypesForTesoreria,
  getEnabledMovementTypesForSecretaria,
  getActiveReceiptFormatsForTesoreria,
  getActiveReceiptFormatsForSecretaria,
  getDashboardTreasuryCardForActiveClub,
  getTreasuryRoleDashboardForActiveClub
} from "@/lib/services/treasury-service";
import { accessRepository } from "@/lib/repositories/access-repository";

export default async function DashboardPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub) {
    redirect("/pending-approval");
  }

  const activeMembership = context.activeMembership;

  if (!activeMembership) {
    redirect("/pending-approval");
  }

  const treasuryCard = await getDashboardTreasuryCardForActiveClub();
  const treasuryRoleDashboard = await getTreasuryRoleDashboardForActiveClub();
  const canOperateSecretariaRole = canOperateSecretaria(activeMembership);
  const canOperateTesoreriaRole = canOperateTesoreria(activeMembership);
  const allTreasuryAccounts = canOperateSecretariaRole || canOperateTesoreriaRole
    ? await accessRepository.listTreasuryAccountsForClub(context.activeClub.id)
    : [];
  const treasuryMovementAccounts = canOperateSecretariaRole
    ? allTreasuryAccounts.filter((account) => account.visibleForSecretaria)
    : [];
  const treasuryTransferTargetAccounts = canOperateSecretariaRole
    ? allTreasuryAccounts.filter((account) => !account.visibleForSecretaria && account.visibleForTesoreria)
    : [];
  const treasuryRoleAccounts = !canOperateSecretariaRole && canOperateTesoreriaRole
    ? allTreasuryAccounts.filter((account) => account.visibleForTesoreria)
    : [];
  const [treasuryCategories, treasuryActivities, treasuryCalendarEvents, treasuryCurrencies, movementTypes, receiptFormats] = canOperateSecretariaRole
      ? await Promise.all([
        accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((categories) =>
          categories.filter((category) => category.visibleForSecretaria)
        ),
        getActiveActivitiesForSecretaria(),
        getEnabledCalendarEventsForSecretaria(),
        getActiveTreasuryCurrenciesForSecretaria(),
        getEnabledMovementTypesForSecretaria(),
        getActiveReceiptFormatsForSecretaria()
      ])
    : [[], [], [], [], [], []];
  const [treasuryRoleCategories, treasuryRoleActivities, treasuryRoleCurrencies, treasuryRoleMovementTypes, treasuryRoleReceiptFormats] =
    !canOperateSecretariaRole && canOperateTesoreriaRole
      ? await Promise.all([
          accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((categories) =>
            categories.filter((category) => category.visibleForTesoreria)
          ),
          getActiveActivitiesForTesoreria(),
          getActiveTreasuryCurrenciesForTesoreria(),
          getEnabledMovementTypesForTesoreria(),
          getActiveReceiptFormatsForTesoreria()
        ])
      : [[], [], [], [], []];

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto flex w-full max-w-[920px] flex-col gap-4 px-4 py-6 sm:py-8">
        {context.availableClubs.length > 1 ? (
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
            <ActiveClubSelector
              clubs={context.availableClubs}
              activeClubId={context.activeClub?.id ?? context.availableClubs[0]?.id ?? ""}
              setActiveClubAction={setActiveClubAction}
            />
          </section>
        ) : null}

        {canOperateSecretariaRole && treasuryCard ? (
          <TreasuryCard
            treasuryCard={treasuryCard}
            movementAccounts={treasuryMovementAccounts}
            transferSourceAccounts={treasuryMovementAccounts}
            transferTargetAccounts={treasuryTransferTargetAccounts}
            categories={treasuryCategories}
            activities={treasuryActivities}
            calendarEvents={treasuryCalendarEvents}
            currencies={treasuryCurrencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            createTreasuryMovementAction={createTreasuryMovementAction}
            updateSecretariaMovementAction={updateSecretariaMovementAction}
            createAccountTransferAction={createAccountTransferAction}
          />
        ) : null}

        {!canOperateSecretariaRole && canOperateTesoreriaRole && treasuryRoleDashboard ? (
          <TreasuryRoleCard
            dashboard={treasuryRoleDashboard}
            accounts={treasuryRoleAccounts}
            categories={treasuryRoleCategories}
            activities={treasuryRoleActivities}
            currencies={treasuryRoleCurrencies}
            movementTypes={treasuryRoleMovementTypes}
            receiptFormats={treasuryRoleReceiptFormats}
            createTreasuryRoleMovementAction={createTreasuryRoleMovementAction}
            createFxOperationAction={createFxOperationAction}
          />
        ) : null}
      </main>
    </div>
  );
}
