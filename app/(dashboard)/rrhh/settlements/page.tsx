import { redirect } from "next/navigation";

import {
  addAdjustmentAction,
  annulSettlementAction,
  confirmSettlementAction,
  confirmSettlementsBulkAction,
  deleteAdjustmentAction,
  generateMonthlySettlementsAction,
  updateHoursOrNotesAction,
} from "@/app/(dashboard)/rrhh/settlements/actions";
import { SettlementsList } from "@/components/hr/settlements-list";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateHrSettlements } from "@/lib/domain/authorization";
import { listSettlementsWithAdjustments } from "@/lib/services/payroll-settlement-service";

export default async function RrhhSettlementsPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canOperateHrSettlements(context.activeMembership)) redirect("/dashboard");

  const data = await listSettlementsWithAdjustments();
  const settlements = data.ok ? data.settlements : [];
  const adjustmentsBySettlementId = data.ok ? data.adjustmentsBySettlementId : {};
  const clubCurrencyCode = context.activeClub.currencyCode;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <SettlementsList
        settlements={settlements}
        adjustmentsBySettlementId={adjustmentsBySettlementId}
        clubCurrencyCode={clubCurrencyCode}
        canOperate
        generateAction={generateMonthlySettlementsAction}
        addAdjustmentAction={addAdjustmentAction}
        deleteAdjustmentAction={deleteAdjustmentAction}
        updateHoursOrNotesAction={updateHoursOrNotesAction}
        confirmAction={confirmSettlementAction}
        confirmBulkAction={confirmSettlementsBulkAction}
        annulAction={annulSettlementAction}
      />
    </main>
  );
}
