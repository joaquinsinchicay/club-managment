import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import {
  createTreasuryMovementAction,
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AppHeader } from "@/components/navigation/app-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import {
  getActiveActivitiesForSecretaria,
  getActiveTreasuryCurrenciesForSecretaria,
  getEnabledMovementTypesForSecretaria,
  getActiveReceiptFormatsForSecretaria,
  getDashboardTreasuryCardForActiveClub
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
  const canOperateTreasury = canOperateSecretaria(activeMembership);
  const treasuryAccounts = canOperateTreasury
    ? (await accessRepository.listTreasuryAccountsForClub(context.activeClub.id)).filter(
        (account) => account.visibleForSecretaria
      )
    : [];
  const [treasuryCategories, treasuryActivities, treasuryCurrencies, movementTypes, receiptFormats] = canOperateTreasury
    ? await Promise.all([
        accessRepository.listTreasuryCategoriesForClub(context.activeClub.id),
        getActiveActivitiesForSecretaria(),
        getActiveTreasuryCurrenciesForSecretaria(),
        getEnabledMovementTypesForSecretaria(),
        getActiveReceiptFormatsForSecretaria()
      ])
    : [[], [], [], [], []];

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
        {context.availableClubs.length > 1 ? (
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
            <ActiveClubSelector
              clubs={context.availableClubs}
              activeClubId={context.activeClub?.id ?? context.availableClubs[0]?.id ?? ""}
              setActiveClubAction={setActiveClubAction}
            />
          </section>
        ) : null}

        {treasuryCard ? (
          <TreasuryCard
            treasuryCard={treasuryCard}
            accounts={treasuryAccounts}
            categories={treasuryCategories}
            activities={treasuryActivities}
            currencies={treasuryCurrencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            createTreasuryMovementAction={createTreasuryMovementAction}
          />
        ) : null}
      </main>
    </div>
  );
}
