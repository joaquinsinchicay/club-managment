import { redirect } from "next/navigation";

import {
  createAccountTransferAction,
  createTreasuryMovementAction,
  updateSecretariaMovementAction,
  updateSecretariaTransferAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForSecretaria,
  getActiveReceiptFormatsForSecretaria,
  getActiveTreasuryCurrenciesForSecretaria,
  getDashboardTreasuryCardForActiveClub,
  getEnabledCalendarEventsForSecretaria,
  getEnabledMovementTypesForSecretaria
} from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

function formatSessionDateChip(sessionDate: string): string {
  const date = new Date(`${sessionDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date);
  const dayMonth = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)} · ${dayMonth}`;
}

export default async function SecretariaDashboardPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    redirect("/dashboard");
  }

  const treasuryCard = await getDashboardTreasuryCardForActiveClub();

  if (!treasuryCard) {
    redirect("/dashboard");
  }

  const allTreasuryAccounts = await accessRepository.listTreasuryAccountsForClub(context.activeClub.id);
  const treasuryMovementAccounts = allTreasuryAccounts.filter((account) => account.visibleForSecretaria);
  const treasuryTransferTargetAccounts = allTreasuryAccounts.filter(
    (account) => !account.visibleForSecretaria && account.visibleForTesoreria
  );
  const [treasuryCategories, treasuryActivities, treasuryCalendarEvents, treasuryCurrencies, movementTypes, receiptFormats] =
    await Promise.all([
      accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((categories) =>
        categories.filter((category) => category.visibleForSecretaria)
      ),
      getActiveActivitiesForSecretaria(),
      getEnabledCalendarEventsForSecretaria(),
      getActiveTreasuryCurrenciesForSecretaria(),
      getEnabledMovementTypesForSecretaria(),
      getActiveReceiptFormatsForSecretaria()
    ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.treasury.section_eyebrow}
        title={texts.dashboard.treasury.title}
        description={texts.dashboard.treasury.description}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {formatSessionDateChip(treasuryCard.sessionDate)}
          </span>
        }
      />

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
        updateSecretariaTransferAction={updateSecretariaTransferAction}
        createAccountTransferAction={createAccountTransferAction}
      />
    </main>
  );
}
