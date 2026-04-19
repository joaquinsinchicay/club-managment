import { redirect } from "next/navigation";

import {
  createAccountTransferAction,
  createFxOperationAction,
  createTreasuryAccountFromTreasuryAction,
  createTreasuryRoleMovementAction,
  updateTreasuryAccountFromTreasuryAction,
  updateTreasuryRoleMovementAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { TreasuryRoleCard } from "@/components/dashboard/treasury-role-card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canMutateTreasurySettings, canOperateTesoreria } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import {
  getActiveActivitiesForTesoreria,
  getEnabledCalendarEventsForTesoreria,
  getActiveReceiptFormatsForTesoreria,
  getActiveTreasuryCurrenciesForTesoreria,
  getEnabledMovementTypesForTesoreria,
  getTreasuryRoleDashboardForActiveClub
} from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

function formatSessionDateLabel(sessionDate: string): string {
  const date = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(date);
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1).replace(/\.$/, "");
  const dateStr = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return `${cap} · ${dateStr}`;
}

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

  const [allAccounts, categories, activities, calendarEvents, currencies, movementTypes, receiptFormats] = await Promise.all([
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

  const accounts = allAccounts.filter((account) => account.visibleForTesoreria);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.treasury_role.eyebrow}
        title={texts.dashboard.treasury_role.title}
        description={texts.dashboard.treasury_role.description}
        actions={
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-small font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-ds-blue" aria-hidden="true" />
            {formatSessionDateLabel(dashboard.sessionDate)}
          </div>
        }
      />

      <TreasuryRoleCard
        dashboard={dashboard}
        accounts={accounts}
        categories={categories}
        activities={activities}
        calendarEvents={calendarEvents}
        currencies={currencies}
        movementTypes={movementTypes}
        receiptFormats={receiptFormats}
        createTreasuryRoleMovementAction={createTreasuryRoleMovementAction}
        updateTreasuryRoleMovementAction={updateTreasuryRoleMovementAction}
        createFxOperationAction={createFxOperationAction}
        createAccountTransferAction={createAccountTransferAction}
        createTreasuryAccountAction={createTreasuryAccountFromTreasuryAction}
        updateTreasuryAccountAction={updateTreasuryAccountFromTreasuryAction}
        allAccounts={allAccounts}
        isAdmin={canMutateTreasurySettings(context.activeMembership)}
      />
    </main>
  );
}
