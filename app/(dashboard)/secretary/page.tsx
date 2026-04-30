import { redirect } from "next/navigation";

import {
  closeDailyCashSessionModalAction,
  openDailyCashSessionModalAction,
  createAccountTransferAction,
  createTreasuryMovementAction,
  updateSecretariaMovementAction,
  updateSecretariaTransferAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { TreasuryDataProvider } from "@/lib/contexts/treasury-data-context";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusChip } from "@/components/ui/status-chip";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForSecretaria,
  getActiveReceiptFormatsForSecretaria,
  getActiveTreasuryCurrenciesForSecretaria,
  getDailyCashSessionValidationForActiveClub,
  getDashboardTreasuryCardForActiveClub,
  getEnabledCalendarEventsForSecretaria,
  getEnabledMovementTypesForSecretaria
} from "@/lib/services/treasury-service";
import { listStaffContractsForMovementSelector } from "@/lib/services/staff-contract-service";
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

  const canOpenSession = treasuryCard.availableActions.includes("open_session");
  const canCloseSession = treasuryCard.availableActions.includes("close_session");

  const staffContractsResult = await listStaffContractsForMovementSelector();
  const staffContractsForMovements = staffContractsResult.ok ? staffContractsResult.options : [];

  const [
    allTreasuryAccounts,
    treasuryCategories,
    treasuryActivities,
    treasuryCalendarEvents,
    treasuryCurrencies,
    movementTypes,
    receiptFormats,
    closeSessionValidation,
    openSessionValidation
  ] = await Promise.all([
    accessRepository.listTreasuryAccountsForClub(context.activeClub.id),
    accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((categories) =>
      categories.filter((category) => category.visibleForSecretaria)
    ),
    getActiveActivitiesForSecretaria(),
    getEnabledCalendarEventsForSecretaria(),
    getActiveTreasuryCurrenciesForSecretaria(),
    getEnabledMovementTypesForSecretaria(),
    getActiveReceiptFormatsForSecretaria(),
    canCloseSession ? getDailyCashSessionValidationForActiveClub("close") : Promise.resolve(null),
    canOpenSession  ? getDailyCashSessionValidationForActiveClub("open")  : Promise.resolve(null)
  ]);

  const treasuryMovementAccounts = allTreasuryAccounts.filter((account) => account.visibleForSecretaria);
  const treasuryTransferTargetAccounts = allTreasuryAccounts.filter(
    (account) => !account.visibleForSecretaria && account.visibleForTesoreria
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.treasury.section_eyebrow}
        title={texts.dashboard.treasury.title}
        description={texts.dashboard.treasury.description}
        actions={
          <StatusChip dot dotClassName="bg-ds-green">
            {formatSessionDateChip(treasuryCard.sessionDate)}
          </StatusChip>
        }
      />

      {/*
        Fase 4 · T3.2 — TreasuryDataProvider centraliza los datos de
        dominio (accounts, categories, activities, currencies, etc.) que
        antes se pasaban como props drilling al TreasuryCard y a sus 7
        forms internos. El page server hidrata el provider una sola vez;
        TreasuryCard y los forms los consumen via useTreasuryData().
        Notas: secretary no maneja `allAccounts` separadamente — se usa
        `treasuryMovementAccounts` como best-effort (no se renderiza el
        accountsTab desde TreasuryCard). `activeCostCenters` se omite (es
        opcional en el context y secretaria no opera CCs).
      */}
      <TreasuryDataProvider
        value={{
          accounts: treasuryMovementAccounts,
          allAccounts: treasuryMovementAccounts,
          categories: treasuryCategories,
          activities: treasuryActivities,
          currencies: treasuryCurrencies,
          movementTypes,
          receiptFormats,
          transferSourceAccounts: treasuryMovementAccounts,
          transferTargetAccounts: treasuryTransferTargetAccounts,
          staffContracts: staffContractsForMovements,
        }}
      >
        <TreasuryCard
          treasuryCard={treasuryCard}
          calendarEvents={treasuryCalendarEvents}
          closeSessionValidation={closeSessionValidation}
          openSessionValidation={openSessionValidation}
          currentUserDisplayName={context.user.fullName}
          createTreasuryMovementAction={createTreasuryMovementAction}
          updateSecretariaMovementAction={updateSecretariaMovementAction}
          updateSecretariaTransferAction={updateSecretariaTransferAction}
          createAccountTransferAction={createAccountTransferAction}
          closeDailyCashSessionModalAction={closeDailyCashSessionModalAction}
          openDailyCashSessionModalAction={openDailyCashSessionModalAction}
        />
      </TreasuryDataProvider>
    </main>
  );
}
