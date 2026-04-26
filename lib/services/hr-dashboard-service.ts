/**
 * Service layer for the RRHH Dashboard (US-68).
 *
 * Computes the 6 operational cards rendered in `/rrhh`:
 *   1. Liquidaciones pendientes de confirmar (count + sum of total_amount).
 *   2. Liquidaciones aprobadas por RRHH pendientes de pago.
 *   3. Costo proyectado del mes (sum of current/frozen amounts for
 *      contracts vigentes during the current month).
 *   4. Ejecutado del mes (sum of total_amount of settlements `pagada`
 *      within the current month based on `paid_at`).
 *   5. Estructuras vacantes (active structures without active contract).
 *   6. Alertas (active staff members without active contracts).
 *
 * The repository helpers already bring enriched rows, so this service is
 * mostly SQL-free: it composes the data we already load for the list
 * pages. For performance, a future iteration can materialize the
 * aggregates; in the MVP the page-level fetch is cheap.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import { payrollSettlementRepository } from "@/lib/repositories/payroll-settlement-repository";
import { salaryStructureRepository } from "@/lib/repositories/salary-structure-repository";
import { staffContractRepository } from "@/lib/repositories/staff-contract-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";

export type HrDashboardSummary = {
  pendingApprove: { count: number; totalAmount: number };
  pendingPay: { count: number; totalAmount: number };
  projectedMonth: number;
  executedMonth: number;
  vacantStructures: number;
  alertsCount: number;
  periodYear: number;
  periodMonth: number;
};

export type HrDashboardResult =
  | { ok: true; summary: HrDashboardSummary }
  | { ok: false; code: "forbidden" | "unauthenticated" | "no_active_club" | "unknown_error" };

export async function getHrDashboardSummary(): Promise<HrDashboardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrModule(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = session.activeClub.id;
  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;

  try {
    const [settlements, contracts, structures, staffMembers] = await Promise.all([
      payrollSettlementRepository.listForClub(clubId),
      staffContractRepository.listForClub(clubId),
      salaryStructureRepository.listForClub(clubId),
      staffMemberRepository.listForClub(clubId),
    ]);

    let pendingApproveCount = 0;
    let pendingApproveAmount = 0;
    let pendingPayCount = 0;
    let pendingPayAmount = 0;
    let executedMonth = 0;

    for (const s of settlements) {
      if (s.status === "generada") {
        pendingApproveCount += 1;
        pendingApproveAmount += s.totalAmount;
      } else if (s.status === "aprobada_rrhh") {
        pendingPayCount += 1;
        pendingPayAmount += s.totalAmount;
      } else if (s.status === "pagada" && s.paidAt) {
        const paidDate = new Date(s.paidAt);
        if (
          paidDate.getFullYear() === periodYear &&
          paidDate.getMonth() + 1 === periodMonth
        ) {
          executedMonth += s.totalAmount;
        }
      }
    }

    // Projected: sum of effective amount of active contracts vigentes that
    // cover at least one day of the current month. Excludes per-hour /
    // per-class because the amount is variable (documented in PDD).
    const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0));
    const projectedMonth = contracts
      .filter((c) => {
        if (c.status !== "vigente") return false;
        if (c.salaryStructureRemunerationType === "por_hora") return false;
        if (c.salaryStructureRemunerationType === "por_clase") return false;
        const start = new Date(`${c.startDate}T00:00:00Z`).getTime();
        const end = c.endDate
          ? new Date(`${c.endDate}T00:00:00Z`).getTime()
          : Number.POSITIVE_INFINITY;
        return start <= periodEnd.getTime() && end >= periodStart.getTime();
      })
      .reduce((acc, c) => acc + (c.currentAmount ?? 0), 0);

    const vacantStructures = structures.filter(
      (s) => s.status === "activa" && !s.hasActiveContract,
    ).length;

    const alertsCount = staffMembers.filter((m) => !m.hasActiveContract).length;

    return {
      ok: true,
      summary: {
        pendingApprove: { count: pendingApproveCount, totalAmount: pendingApproveAmount },
        pendingPay: { count: pendingPayCount, totalAmount: pendingPayAmount },
        projectedMonth,
        executedMonth,
        vacantStructures,
        alertsCount,
        periodYear,
        periodMonth,
      },
    };
  } catch (error) {
    console.error("[hr-dashboard-service.summary]", error);
    return { ok: false, code: "unknown_error" };
  }
}
