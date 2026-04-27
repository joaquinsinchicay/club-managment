import { redirect } from "next/navigation";

import {
  addAdjustmentAction,
  annulSettlementAction,
  approveSettlementAction,
  approveSettlementsBulkAction,
  deleteAdjustmentAction,
  generateMonthlySettlementsAction,
  payStaffSettlementAction,
  payStaffSettlementsBatchAction,
  returnSettlementToGeneratedAction,
  updateHoursOrNotesAction,
} from "@/app/(dashboard)/rrhh/settlements/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { SettlementsList } from "@/components/hr/settlements-list";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateHrSettlements } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import { listSettlementsWithAdjustments } from "@/lib/services/payroll-settlement-service";

export default async function RrhhSettlementsPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canOperateHrSettlements(context.activeMembership)) redirect("/dashboard");

  const clubId = context.activeClub.id;
  const clubCurrencyCode = context.activeClub.currencyCode;

  const [settlementsData, accounts] = await Promise.all([
    listSettlementsWithAdjustments(),
    accessRepository.listTreasuryAccountsForClub(clubId),
  ]);

  const settlements = settlementsData.ok ? settlementsData.settlements : [];
  const adjustmentsBySettlementId = settlementsData.ok
    ? settlementsData.adjustmentsBySettlementId
    : {};

  // Only accounts visible for tesoreria that support the club's currency
  // are payable targets for RRHH settlements.
  const payableAccounts = accounts.filter(
    (a) => a.visibleForTesoreria && a.currencies.includes(clubCurrencyCode),
  );

  return (
    <>
      <RrhhModuleNav activeTab="settlements" />
      <SettlementsList
        settlements={settlements}
        adjustmentsBySettlementId={adjustmentsBySettlementId}
        clubCurrencyCode={clubCurrencyCode}
        canOperate
        payableAccounts={payableAccounts}
        generateAction={generateMonthlySettlementsAction}
        addAdjustmentAction={addAdjustmentAction}
        deleteAdjustmentAction={deleteAdjustmentAction}
        updateHoursOrNotesAction={updateHoursOrNotesAction}
        approveAction={approveSettlementAction}
        approveBulkAction={approveSettlementsBulkAction}
        returnAction={returnSettlementToGeneratedAction}
        annulAction={annulSettlementAction}
        payAction={payStaffSettlementAction}
        payBatchAction={payStaffSettlementsBatchAction}
      />
    </>
  );
}
