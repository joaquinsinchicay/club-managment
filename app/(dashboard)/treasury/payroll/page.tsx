import { redirect } from "next/navigation";

import {
  payStaffSettlementAction,
  payStaffSettlementsBatchAction,
  returnSettlementToGeneratedAction,
} from "@/app/(dashboard)/rrhh/settlements/actions";
import { TreasuryPayrollTray } from "@/components/treasury/payroll-tray";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessTreasuryPayrollTray } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import { listApprovedSettlementsForTreasury } from "@/lib/services/treasury-payroll-service";

export default async function TreasuryPayrollPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessTreasuryPayrollTray(context.activeMembership)) redirect("/treasury");

  const clubId = context.activeClub.id;
  const clubCurrencyCode = context.activeClub.currencyCode;

  const [trayResult, accounts] = await Promise.all([
    listApprovedSettlementsForTreasury(),
    accessRepository.listTreasuryAccountsForClub(clubId),
  ]);

  const settlements = trayResult.ok ? trayResult.settlements : [];
  const adjustmentsBySettlementId = trayResult.ok ? trayResult.adjustmentsBySettlementId : {};

  const payableAccounts = accounts.filter(
    (a) => a.visibleForTesoreria && a.currencies.includes(clubCurrencyCode),
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <TreasuryPayrollTray
        settlements={settlements}
        adjustmentsBySettlementId={adjustmentsBySettlementId}
        clubCurrencyCode={clubCurrencyCode}
        payableAccounts={payableAccounts}
        payAction={payStaffSettlementAction}
        payBatchAction={payStaffSettlementsBatchAction}
        returnAction={returnSettlementToGeneratedAction}
      />
    </main>
  );
}
