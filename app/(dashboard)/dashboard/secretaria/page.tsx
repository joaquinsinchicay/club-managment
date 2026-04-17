import { redirect } from "next/navigation";

import {
  createAccountTransferAction,
  createTreasuryMovementAction,
  updateSecretariaMovementAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForSecretaria,
  getActiveReceiptFormatsForSecretaria,
  getActiveTreasuryCurrenciesForSecretaria,
  getDashboardTreasuryCardForActiveClub,
  getDailyCashSessionValidationForActiveClub,
  getEnabledCalendarEventsForSecretaria,
  getEnabledMovementTypesForSecretaria
} from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

function getSessionTone(status: "open" | "closed" | "not_started") {
  if (status === "open") {
    return "success";
  }

  if (status === "closed") {
    return "danger";
  }

  return "warning";
}

function getSessionLabel(status: "open" | "closed" | "not_started") {
  if (status === "open") {
    return texts.dashboard.treasury.session_open;
  }

  if (status === "closed") {
    return texts.dashboard.treasury.session_closed;
  }

  return texts.dashboard.treasury.session_not_started;
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
  const [treasuryCategories, treasuryActivities, treasuryCalendarEvents, treasuryCurrencies, movementTypes, receiptFormats, sessionOpenValidation, sessionCloseValidation] =
    await Promise.all([
      accessRepository.listTreasuryCategoriesForClub(context.activeClub.id).then((categories) =>
        categories.filter((category) => category.visibleForSecretaria)
      ),
      getActiveActivitiesForSecretaria(),
      getEnabledCalendarEventsForSecretaria(),
      getActiveTreasuryCurrenciesForSecretaria(),
      getEnabledMovementTypesForSecretaria(),
      getActiveReceiptFormatsForSecretaria(),
      treasuryCard.sessionStatus === "not_started"
        ? getDailyCashSessionValidationForActiveClub("open")
        : null,
      treasuryCard.sessionStatus === "open"
        ? getDailyCashSessionValidationForActiveClub("close")
        : null
    ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.header.navigation.secretaria}
        title={texts.dashboard.treasury.title}
        description={texts.dashboard.treasury.description}
        actions={
          treasuryCard.sessionStatus === "unresolved" ? null : (
            <StatusBadge
              label={getSessionLabel(treasuryCard.sessionStatus)}
              tone={getSessionTone(treasuryCard.sessionStatus)}
            />
          )
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
        sessionOpenValidation={sessionOpenValidation}
        sessionCloseValidation={sessionCloseValidation}
        createTreasuryMovementAction={createTreasuryMovementAction}
        updateSecretariaMovementAction={updateSecretariaMovementAction}
        createAccountTransferAction={createAccountTransferAction}
      />
    </main>
  );
}
