"use client";

import { type ReactNode } from "react";

import { TreasuryConciliacionTab } from "@/components/dashboard/treasury-conciliacion-tab";
import { CuentasTab } from "@/components/dashboard/treasury-role/cuentas-tab";
import { TreasuryRoleModals } from "@/components/dashboard/treasury-role/modals";
import { MovimientosTab } from "@/components/dashboard/treasury-role/movimientos-tab";
import { ResumenTab } from "@/components/dashboard/treasury-role/resumen-tab";
import { SubTabNav } from "@/components/dashboard/treasury-role/sub-tab-nav";
import { BlockingStatusOverlay } from "@/components/ui/overlay";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";
import { useTreasuryRoleCard } from "@/lib/hooks/use-treasury-role-card";
import {
  buildLastMovementByAccountId,
  getTotalBalances,
} from "@/lib/treasury-role-helpers";
import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import type {
  ClubCalendarEvent,
  TreasuryConsolidationDashboard,
  TreasuryRoleDashboard,
} from "@/lib/domain/access";

// Datos de dominio (accounts, categories, activities, currencies,
// movementTypes, receiptFormats, allAccounts, transferSource/Target,
// activeCostCenters, staffContracts) viven en `<TreasuryDataProvider>`
// y se consumen vía useTreasuryData().
type TreasuryRoleCardProps = {
  dashboard: TreasuryRoleDashboard;
  calendarEvents: ClubCalendarEvent[];
  createTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createFxOperationAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createAccountTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  isAdmin: boolean;
  consolidationDashboard: TreasuryConsolidationDashboard | null;
  updateMovementBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  updateTransferBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  executeDailyConsolidationAction: (formData: FormData) => Promise<void>;
  // US-52: Optional slot rendered inside the "Centros de Costo" sub-tab when
  // the current user can access it. The page server-side prepares this tree
  // with pre-fetched data and bound server actions.
  costCentersTab?: ReactNode;
  // US-71: Sub-tab "Pagos pendientes" embebido. Se renderiza solo cuando el
  // usuario tiene rol Tesorería y el page server prepara los datos.
  payrollTab?: ReactNode;
  payrollPendingCount?: number;
};

export function TreasuryRoleCard({
  dashboard,
  calendarEvents,
  createTreasuryRoleMovementAction,
  updateTreasuryRoleMovementAction,
  createFxOperationAction,
  createAccountTransferAction,
  createTreasuryAccountAction,
  updateTreasuryAccountAction,
  isAdmin,
  consolidationDashboard,
  updateMovementBeforeConsolidationAction,
  updateTransferBeforeConsolidationAction,
  executeDailyConsolidationAction,
  costCentersTab,
  payrollTab,
  payrollPendingCount = 0,
}: TreasuryRoleCardProps) {
  const { accounts, allAccounts, activeCostCenters } = useTreasuryData();
  const showPayrollTab = payrollTab !== undefined;

  const card = useTreasuryRoleCard({
    dashboard,
    showPayrollTab,
    actions: {
      createTreasuryRoleMovementAction,
      updateTreasuryRoleMovementAction,
      createFxOperationAction,
      createAccountTransferAction,
      createTreasuryAccountAction,
      updateTreasuryAccountAction,
    },
  });

  const totalBalances = getTotalBalances(dashboard.accounts);
  const canCreateMovement = dashboard.availableActions.includes("create_movement");
  const canCreateFxOperation = dashboard.availableActions.includes("create_fx_operation");
  const canCreateTransfer =
    dashboard.availableActions.includes("create_transfer") && allAccounts.length >= 2;
  const lastMovementByAccountId = buildLastMovementByAccountId(dashboard.movementGroups);

  return (
    <>
      <BlockingStatusOverlay
        open={card.pendingOverlayLabel !== null}
        label={card.pendingOverlayLabel ?? ""}
      />

      <div className="space-y-4">
        <SubTabNav
          active={card.activeTab}
          onChange={card.setActiveTab}
          showPayroll={showPayrollTab}
          payrollCount={payrollPendingCount}
        />

        {card.activeTab === "payroll" && payrollTab}

        {card.activeTab === "resumen" && (
          <ResumenTab
            dashboard={dashboard}
            accounts={accounts}
            totalBalances={totalBalances}
            canCreateMovement={canCreateMovement}
            canCreateFxOperation={canCreateFxOperation}
            canCreateTransfer={canCreateTransfer}
            onMovement={() => card.setActiveModal("movement")}
            onFx={() => card.setActiveModal("fx")}
            onTransfer={() => card.setActiveModal("transfer")}
            onConciliacion={card.handleConciliacion}
            onMovements={() => card.setActiveTab("movimientos")}
            onViewAllAccounts={() => card.setActiveTab("cuentas")}
          />
        )}

        {card.activeTab === "cuentas" && (
          <CuentasTab
            accounts={allAccounts}
            dashboardAccounts={dashboard.accounts}
            totalBalances={totalBalances}
            isAdmin={isAdmin}
            lastMovementByAccountId={lastMovementByAccountId}
            onCreateAccount={() => card.setActiveModal("create_account")}
            onEditAccount={card.handleEditAccount}
          />
        )}

        {card.activeTab === "movimientos" && (
          <MovimientosTab
            dashboard={dashboard}
            selectedAccountId={card.selectedMovementAccountId}
            onSelectAccount={card.setSelectedMovementAccountId}
            onEditMovement={card.handleEditMovement}
            canCreateMovement={canCreateMovement}
            canCreateFxOperation={canCreateFxOperation}
            canCreateTransfer={canCreateTransfer}
            onCreateMovement={() => card.setActiveModal("movement")}
            onCreateTransfer={() => card.setActiveModal("transfer")}
            onCreateFx={() => card.setActiveModal("fx")}
            onUpdateDateRange={card.handleUpdateMovementsDateRange}
            isDateRangePending={card.isMovementsRangePending}
          />
        )}

        {card.activeTab === "conciliacion" && consolidationDashboard && (
          <TreasuryConciliacionTab
            dashboard={consolidationDashboard}
            calendarEvents={calendarEvents}
            updateMovementBeforeConsolidationAction={updateMovementBeforeConsolidationAction}
            updateTransferBeforeConsolidationAction={updateTransferBeforeConsolidationAction}
            executeDailyConsolidationAction={executeDailyConsolidationAction}
          />
        )}

        {card.activeTab === "cost_centers" && costCentersTab}
      </div>

      <TreasuryRoleModals
        activeModal={card.activeModal}
        selectedMovement={card.selectedMovement}
        editingAccount={card.editingAccount}
        dashboard={dashboard}
        accounts={accounts}
        allAccounts={allAccounts}
        activeCostCenters={activeCostCenters}
        isMovementSubmissionPending={card.isMovementSubmissionPending}
        isMovementUpdatePending={card.isMovementUpdatePending}
        isFxSubmissionPending={card.isFxSubmissionPending}
        isTransferSubmissionPending={card.isTransferSubmissionPending}
        isAccountSubmissionPending={card.isAccountSubmissionPending}
        onClose={card.closeAllModals}
        onCreateMovement={card.handleCreateTreasuryRoleMovement}
        onUpdateMovement={card.handleUpdateTreasuryRoleMovement}
        onCreateFx={card.handleCreateFxOperation}
        onCreateTransfer={card.handleCreateAccountTransfer}
        onCreateAccount={card.handleCreateAccount}
        onUpdateAccount={card.handleUpdateAccount}
      />
    </>
  );
}
