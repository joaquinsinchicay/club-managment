import { redirect } from "next/navigation";

import {
  createAccountTransferAction,
  createFxOperationAction,
  createTreasuryAccountFromTreasuryAction,
  createTreasuryRoleMovementAction,
  updateTreasuryAccountFromTreasuryAction,
  updateTreasuryRoleMovementAction
} from "@/app/(dashboard)/dashboard/treasury-actions";
import {
  payStaffSettlementAction,
  payStaffSettlementsBatchAction,
  returnSettlementToGeneratedAction
} from "@/app/(dashboard)/rrhh/settlements/actions";
import {
  executeDailyConsolidationAction,
  updateMovementBeforeConsolidationAction,
  updateTransferBeforeConsolidationAction
} from "@/app/(dashboard)/treasury/actions";
import {
  createCostCenterAction,
  updateCostCenterAction
} from "@/app/(dashboard)/treasury/cost-centers/actions";
import { CostCentersTab } from "@/components/treasury/cost-centers-tab";
import { TreasuryPayrollPendingCard } from "@/components/treasury/payroll-pending-card";
import { TreasuryPayrollTab } from "@/components/treasury/treasury-payroll-tab";
import { TreasuryRoleCard } from "@/components/dashboard/treasury-role-card";
import { TreasuryDataProvider } from "@/lib/contexts/treasury-data-context";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusChip } from "@/components/ui/status-chip";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessCostCenters,
  canAccessTreasuryPayrollTray,
  canMutateTreasurySettings,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import { listCostCentersForActiveClub } from "@/lib/services/cost-center-service";
import { listStaffContractsForMovementSelector } from "@/lib/services/staff-contract-service";
import { getTreasuryPayrollData } from "@/lib/services/treasury-payroll-service";
import {
  ensureDailyCashSessionGuardSafe,
  getActiveActivitiesForTesoreria,
  getEnabledCalendarEventsForTesoreria,
  getActiveReceiptFormatsForTesoreria,
  getActiveTreasuryCurrenciesForTesoreria,
  getEnabledMovementTypesForTesoreria,
  getTreasuryConsolidationDashboard,
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

// Forzar render dinámico en cada request — la página depende de auth + datos
// frescos de movements/balances. Sin esto, Vercel puede servir SSR cacheado
// (visto en deploy ky38oli3z mostrando saldos pre-import).
export const dynamic = "force-dynamic";

type TreasuryDashboardPageProps = {
  searchParams?: {
    tab?: string;
    date?: string;
    /** Inicio del rango de movimientos (YYYY-MM-DD). Default: today - 29 días. */
    movements_from?: string;
    /** Fin del rango de movimientos (YYYY-MM-DD). Default: today. */
    movements_to?: string;
  };
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeDateParam(value: string | undefined) {
  return value && ISO_DATE_RE.test(value) ? value : undefined;
}

export default async function TreasuryDashboardPage({ searchParams }: TreasuryDashboardPageProps) {
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

  // Guard de jornada vencida (antes vivía en el layout root, hoy se invoca
  // explícitamente solo en las pages que muestran info de jornada).
  await ensureDailyCashSessionGuardSafe({
    activeClub: { id: context.activeClub.id },
    user: { id: context.user.id }
  });

  const movementsFromDate = sanitizeDateParam(searchParams?.movements_from);
  const movementsToDate = sanitizeDateParam(searchParams?.movements_to);

  const [dashboard, consolidationDashboard] = await Promise.all([
    getTreasuryRoleDashboardForActiveClub({ movementsFromDate, movementsToDate }),
    getTreasuryConsolidationDashboard(searchParams?.date)
  ]);

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
  const transferSourceAccounts = allAccounts.filter((account) => account.visibleForSecretaria);
  const transferTargetAccounts = allAccounts.filter(
    (account) => !account.visibleForSecretaria && account.visibleForTesoreria
  );

  // US-45 + US-71: Card "Pagos de nómina pendientes" + sub-tab embebido en
  // TreasuryRoleCard. Lectura unificada (1 query a payroll_settlements
  // filtrada `aprobada_rrhh` en SQL + 1 batch de adjustments). Si el rol no
  // aplica, todo queda en defaults y el tab no renderiza.
  const canSeePayroll = canAccessTreasuryPayrollTray(context.activeMembership);
  const payrollData = canSeePayroll ? await getTreasuryPayrollData() : null;
  const payrollPending = payrollData && payrollData.ok ? payrollData.summary : null;
  const payrollSettlements = payrollData && payrollData.ok ? payrollData.settlements : [];
  const payrollAdjustments = payrollData && payrollData.ok ? payrollData.adjustmentsBySettlementId : {};
  const payrollApproverNames = payrollData && payrollData.ok ? payrollData.approverNamesByUserId : {};
  const payableAccounts = canSeePayroll
    ? allAccounts.filter(
        (a) => a.visibleForTesoreria && a.currencies.includes(context.activeClub!.currencyCode)
      )
    : [];

  // US-52: Centros de Costo — solo rol tesoreria. Se prefetch en server para
  // pasar por prop al slot de la sub-tab. Si el rol no aplica, costCentersTab
  // queda undefined y la pestaña no renderiza nada.
  const canSeeCostCenters = canAccessCostCenters(context.activeMembership);
  const costCentersData = canSeeCostCenters ? await listCostCentersForActiveClub() : null;
  const clubMembers = canSeeCostCenters
    ? await accessRepository.listClubMembers(context.activeClub.id)
    : [];

  const availableCurrencies = Array.from(
    new Set(
      [
        ...currencies.map((c) => c.currencyCode),
        ...allAccounts.flatMap((a) => a.currencies)
      ].filter(Boolean)
    )
  );

  const payrollTabNode = canSeePayroll ? (
    <TreasuryPayrollTab
      settlements={payrollSettlements}
      adjustmentsBySettlementId={payrollAdjustments}
      approverNamesByUserId={payrollApproverNames}
      clubCurrencyCode={context.activeClub.currencyCode}
      payableAccounts={payableAccounts}
      payAction={payStaffSettlementAction}
      payBatchAction={payStaffSettlementsBatchAction}
      returnAction={returnSettlementToGeneratedAction}
    />
  ) : undefined;

  const costCentersTabNode =
    canSeeCostCenters && costCentersData && costCentersData.ok ? (
      <CostCentersTab
        costCenters={costCentersData.costCenters}
        aggregates={Object.fromEntries(costCentersData.aggregates)}
        badges={Object.fromEntries(costCentersData.badges)}
        members={clubMembers.filter((m) => m.status === "activo")}
        availableCurrencies={availableCurrencies}
        createCostCenterAction={createCostCenterAction}
        updateCostCenterAction={updateCostCenterAction}
      />
    ) : undefined;

  // US-53: pasar TODOS los CCs (activos + inactivos) al form. Los inactivos
  // se renderizan en el multiselect solo si ya estan seleccionados en el
  // movimiento (para no perder visibilidad del link historico) y aparecen
  // como disabled si no estan seleccionados (para evitar nuevos links a CCs
  // cerrados). Secretaria sigue sin recibir el field.
  const costCentersForMovements =
    canSeeCostCenters && costCentersData && costCentersData.ok
      ? costCentersData.costCenters.map((cc) => ({
          id: cc.id,
          name: cc.name,
          type: cc.type,
          currencyCode: cc.currencyCode,
          status: cc.status
        }))
      : undefined;

  // Lista minima de contratos RRHH para el selector "Contrato" en los forms
  // de creacion y edicion de movimientos. Falla silenciosa: si no hay
  // contratos o el call falla, el field no se renderiza.
  const staffContractsForMovementsResult = await listStaffContractsForMovementSelector();
  const staffContractsForMovements =
    staffContractsForMovementsResult.ok ? staffContractsForMovementsResult.options : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.treasury_role.eyebrow}
        title={texts.dashboard.treasury_role.title}
        description={texts.dashboard.treasury_role.description}
        actions={
          <StatusChip dot tone="success">
            {formatSessionDateLabel(dashboard.sessionDate)}
          </StatusChip>
        }
      />

      {payrollPending && payrollPending.count > 0 ? (
        <TreasuryPayrollPendingCard
          count={payrollPending.count}
          totalAmount={payrollPending.totalAmount}
          clubCurrencyCode={context.activeClub.currencyCode}
        />
      ) : null}

      {/*
        Fase 4 · T3.2 — TreasuryDataProvider centraliza los datos de
        dominio (accounts, categories, activities, currencies, etc.)
        que antes se pasaban como props drilling de 8+ niveles. Por ahora
        solo TreasuryRoleCard los consume vía useTreasuryData(); los 7
        forms internos siguen recibiendolos por props desde TreasuryRoleCard.
        La migración de los forms a context queda para una iteración futura.
      */}
      <TreasuryDataProvider
        value={{
          accounts,
          allAccounts,
          categories,
          activities,
          currencies,
          movementTypes,
          receiptFormats,
          transferSourceAccounts,
          transferTargetAccounts,
          activeCostCenters: costCentersForMovements,
          staffContracts: staffContractsForMovements,
        }}
      >
        <TreasuryRoleCard
          dashboard={dashboard}
          calendarEvents={calendarEvents}
          createTreasuryRoleMovementAction={createTreasuryRoleMovementAction}
          updateTreasuryRoleMovementAction={updateTreasuryRoleMovementAction}
          createFxOperationAction={createFxOperationAction}
          createAccountTransferAction={createAccountTransferAction}
          createTreasuryAccountAction={createTreasuryAccountFromTreasuryAction}
          updateTreasuryAccountAction={updateTreasuryAccountFromTreasuryAction}
          isAdmin={canMutateTreasurySettings(context.activeMembership)}
          consolidationDashboard={consolidationDashboard}
          updateMovementBeforeConsolidationAction={updateMovementBeforeConsolidationAction}
          updateTransferBeforeConsolidationAction={updateTransferBeforeConsolidationAction}
          executeDailyConsolidationAction={executeDailyConsolidationAction}
          costCentersTab={costCentersTabNode}
          payrollTab={payrollTabNode}
          payrollPendingCount={payrollPending?.count ?? 0}
        />
      </TreasuryDataProvider>
    </main>
  );
}
